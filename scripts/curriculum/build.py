"""Builds public/courses/<id>.json from the authored lesson modules in this folder.

Each lesson is authored with a few hand-written questions; questions made from the lesson's
vocabulary (meaning, reading, fill-in-the-blank) are added until the quiz has exactly 10,
so every lesson is passed with 8/10.

Run: python scripts/curriculum/build.py [course ...]
"""
import importlib
import json
import os
import random
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "..", "public", "courses")
VERSION = "1.1.0"          # keep in step with CURRICULUM_VERSION in src/lib/course-library.ts
COURSES = ["everyday", "travel", "business", "technology", "healthcare", "finance", "refrigeration"]
QUIZ_SIZE = 10
LEVELS = ["A1", "A2", "B1", "B2"]

# language-specific names, set by the course modules through `config`
import config  # noqa: E402


def L(level, category, title, objective, dialogue, vocab, grammar, pron, qs, speak):
    return {
        "level": level, "category": category, "title": title, "objective": objective,
        "dialogue": dialogue, "vocab": vocab, "grammar": grammar, "pron": pron,
        "qs": qs, "speak": speak,
    }


def split_example(example):
    """'sentence (Vietnamese)' -> ('sentence', 'Vietnamese')"""
    match = re.match(r"^(.*?)\s*[(（]([^)）]*)[)）]\s*$", example)
    return (match.group(1).strip(), match.group(2).strip()) if match else (example.strip(), "")


def blank(example, term):
    target, meaning = split_example(example)
    if term not in target:
        return None
    return target.replace(term, "＿＿＿", 1), meaning


def vocab_questions(lesson, rng, needed):
    """Meaning, reading and fill-in questions from the lesson vocabulary, interleaved."""
    vocab = lesson["vocab"]
    gaps, meanings, readings = [], [], []
    for index, (term, reading, meaning, example) in enumerate(vocab):
        others = [v for i, v in enumerate(vocab) if i != index]
        rng.shuffle(others)
        pair = others[:2]
        filled = blank(example, term)
        if filled:
            sentence, translation = filled
            hint = f"  ({translation})" if translation else ""
            gaps.append((f"Điền từ thích hợp vào chỗ trống: {sentence}{hint}", [term] + [o[0] for o in pair], term,
                         f"Đáp án: 「{term}」 ({meaning}). Câu đầy đủ: {split_example(example)[0]}"))
        meanings.append((f"「{term}」 có nghĩa là gì?", [meaning] + [o[2] for o in pair], meaning,
                         f"「{term}」 [{reading}] = {meaning}."))
        if reading and reading != term and any(o[1] and o[1] != reading for o in others):
            alt = [o[1] for o in others if o[1] and o[1] != reading][:2]
            if len(alt) == 2:
                readings.append((f"「{term}」 đọc là gì?", [reading] + alt, reading,
                                 f"「{term}」 đọc là [{reading}], nghĩa là {meaning}."))
    for pool in (gaps, meanings, readings):
        rng.shuffle(pool)
    picked = []
    while len(picked) < needed and (gaps or meanings or readings):
        for pool in (meanings, readings, gaps):
            if pool and len(picked) < needed:
                picked.append(pool.pop())
    out = []
    for prompt, options, correct, explanation in picked:
        options = options[:]
        rng.shuffle(options)
        out.append({"prompt": prompt, "options": options, "answer": options.index(correct), "explanation": explanation})
    return out


def build_course(course_id):
    module = importlib.import_module(course_id)
    rng = random.Random(course_id)
    lessons = []
    counters = {level: 0 for level in LEVELS}
    for raw in module.LESSONS:
        level = raw["level"]
        counters[level] += 1
        lesson_id = f"{course_id}-{level.lower()}-{counters[level]}"
        questions = [{"prompt": p, "options": o, "answer": a, "explanation": e} for (p, o, a, e) in raw["qs"]]
        for q in questions:
            if not 0 <= q["answer"] < len(q["options"]):
                raise ValueError(f"{lesson_id}: bad answer index in “{q['prompt']}”")
            if len(set(q["options"])) != len(q["options"]):
                raise ValueError(f"{lesson_id}: duplicate options in “{q['prompt']}”")
            # Authors tend to put the right answer in the same slot; shuffle it away.
            correct = q["options"][q["answer"]]
            rng.shuffle(q["options"])
            q["answer"] = q["options"].index(correct)
        questions += vocab_questions(raw, rng, QUIZ_SIZE - len(questions))
        if len(questions) != QUIZ_SIZE:
            raise ValueError(f"{lesson_id}: has {len(questions)} questions, needs {QUIZ_SIZE}")
        g_title, g_expl, g_examples = raw["grammar"]
        p_focus, p_tip, p_words = raw["pron"]
        dialogue = [
            {"speaker": sp, "text": text, **({"phonetic": ph} if ph else {}), "translation": vi}
            for (sp, text, ph, vi) in raw["dialogue"]
        ]
        lessons.append({
            "id": lesson_id,
            "level": level,
            "unit": f"{config.LEVEL_LABELS[level]} · Bài {counters[level]}",
            "category": raw["category"],
            "title": raw["title"],
            "objective": raw["objective"],
            "reading": "\n".join(f"{d['speaker']}: {d['text']}" if d["speaker"] else d["text"] for d in dialogue),
            "dialogue": dialogue,
            "vocabulary": [
                {"term": t, "reading": r, "definition": d, "example": x} for (t, r, d, x) in raw["vocab"]
            ],
            "grammar": {"title": g_title, "explanation": g_expl, "examples": g_examples},
            "pronunciation": {"focus": p_focus, "tip": p_tip, "words": p_words},
            "speakingTasks": raw["speak"],
            "questions": questions,
            "audioIds": [],
        })
    lessons.sort(key=lambda item: LEVELS.index(item["level"]))
    return {
        "id": course_id,
        "title": module.TITLE,
        "version": VERSION,
        "framework": config.FRAMEWORK,
        "overview": module.OVERVIEW,
        "contentLicense": config.LICENSE,
        "references": config.REFERENCES,
        "lessons": lessons,
        "audio": [],
    }


def main():
    sys.path.insert(0, HERE)
    os.makedirs(OUT, exist_ok=True)
    for course_id in sys.argv[1:] or COURSES:
        course = build_course(course_id)
        with open(os.path.join(OUT, f"{course_id}.json"), "w", encoding="utf-8") as handle:
            json.dump(course, handle, ensure_ascii=False, indent=1)
        print(f"{course_id}: {len(course['lessons'])} lessons, {sum(len(l['questions']) for l in course['lessons'])} questions")


if __name__ == "__main__":
    main()
