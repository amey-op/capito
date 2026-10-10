import json
import os

levels = {
    "7": ["7.1", "7.2", "7.3"],
    "8": ["8.1", "8.2", "8.3"],
    "9": ["9.1"]
}

def make_lesson(id, lvl):
    tier = "must" if id in ["7.1", "8.1", "8.2", "8.3", "9.1"] else "should"
    l = {
      "id": id,
      "level": int(lvl),
      "tier": tier,
      "titleKey": f"lesson.{id.replace('.', '_')}.title",
      "gutCheck": {
        "promptKey": f"lesson.{id.replace('.', '_')}.gut.prompt",
        "choices": [
          {"id": "c1", "labelKey": f"lesson.{id.replace('.', '_')}.gut.c1.label", "resultKey": f"lesson.{id.replace('.', '_')}.gut.c1.result", "tone": "bad"},
          {"id": "c2", "labelKey": f"lesson.{id.replace('.', '_')}.gut.c2.label", "resultKey": f"lesson.{id.replace('.', '_')}.gut.c2.result", "tone": "good"}
        ],
        "bridgeKey": f"lesson.{id.replace('.', '_')}.gut.bridge"
      },
      "cards": [
        {"id": "c1", "textKey": f"lesson.{id.replace('.', '_')}.c1.text"},
        {"id": "c2", "textKey": f"lesson.{id.replace('.', '_')}.c2.text"},
        {"id": "c3", "textKey": f"lesson.{id.replace('.', '_')}.c3.text"},
        {"id": "c4", "textKey": f"lesson.{id.replace('.', '_')}.c4.text"},
        {"id": "c5", "textKey": f"lesson.{id.replace('.', '_')}.c5.text"}
      ],
      "quiz": [
        {"id": "q1", "type": "single", "promptKey": f"lesson.{id.replace('.', '_')}.q1.prompt", "options": [f"lesson.{id.replace('.', '_')}.q1.o1", f"lesson.{id.replace('.', '_')}.q1.o2"], "correct": 1, "feedbackRightKey": f"lesson.{id.replace('.', '_')}.q1.right", "feedbackWrongKey": f"lesson.{id.replace('.', '_')}.q1.wrong"},
        {"id": "q2", "type": "trueFalse", "promptKey": f"lesson.{id.replace('.', '_')}.q2.prompt", "correct": False, "feedbackRightKey": f"lesson.{id.replace('.', '_')}.q2.right", "feedbackWrongKey": f"lesson.{id.replace('.', '_')}.q2.wrong"},
        {"id": "q3", "type": "single", "promptKey": f"lesson.{id.replace('.', '_')}.q3.prompt", "options": [f"lesson.{id.replace('.', '_')}.q3.o1", f"lesson.{id.replace('.', '_')}.q3.o2"], "correct": 0, "feedbackRightKey": f"lesson.{id.replace('.', '_')}.q3.right", "feedbackWrongKey": f"lesson.{id.replace('.', '_')}.q3.wrong"}
      ],
      "terms": [],
      "portfolioEffect": {
        "decisionKey": f"lesson.{id.replace('.', '_')}.portfolio",
        "unlocks": [],
        "monthAdvances": True
      },
      "facts": []
    }

    if id == "9.1":
        l["finalQuiz"] = [
            {"id": f"fq{i}", "type": "trueFalse", "promptKey": f"lesson.9_1.fq{i}.prompt", "correct": True, "feedbackRightKey": f"lesson.9_1.fq{i}.right", "feedbackWrongKey": f"lesson.9_1.fq{i}.wrong"} for i in range(1, 11)
        ]
        
    return l

for lvl, ids in levels.items():
    os.makedirs(f"src/content/levels/level{lvl}", exist_ok=True)
    for id in ids:
        with open(f"src/content/levels/level{lvl}/{id}.json", "w") as f:
            json.dump(make_lesson(id, lvl), f, indent=2)

print("Generated structures.")
