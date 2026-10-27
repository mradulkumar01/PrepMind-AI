"""Small curated starter library. Runtime copies are stored and served from MongoDB."""

LANGUAGES = {
    "python": {"judge0_id": 71, "label": "Python 3", "extension": "py"},
    "javascript": {"judge0_id": 63, "label": "JavaScript (Node.js)", "extension": "js"},
    "java": {"judge0_id": 62, "label": "Java", "extension": "java"},
    "cpp": {"judge0_id": 54, "label": "C++ 17", "extension": "cpp"},
    "c": {"judge0_id": 50, "label": "C (GCC)", "extension": "c"},
    "sql": {"judge0_id": 82, "label": "SQLite", "extension": "sql"},
}

STARTER = {
    "python": "import sys\n\ndef solve():\n    data = sys.stdin.read().strip().split()\n    # Parse the input format shown in the problem.\n    # TODO: implement the solution\n    print(\"\")\n\nif __name__ == \"__main__\":\n    solve()\n",
    "javascript": "const fs = require('fs');\nconst data = fs.readFileSync(0, 'utf8').trim().split(/\\s+/);\n// Parse the input format shown in the problem.\n// TODO: implement the solution\nconsole.log('');\n",
    "java": "import java.io.*;\nimport java.util.*;\n\npublic class Main {\n  public static void main(String[] args) throws Exception {\n    Scanner in = new Scanner(System.in);\n    // Parse the input format shown in the problem.\n    // TODO: implement the solution\n    System.out.println(\"\");\n  }\n}\n",
    "cpp": "#include <bits/stdc++.h>\nusing namespace std;\nint main() {\n  ios::sync_with_stdio(false); cin.tie(nullptr);\n  // Parse the input format shown in the problem.\n  // TODO: implement the solution\n  cout << \"\\n\";\n}\n",
    "c": "#include <stdio.h>\nint main(void) {\n  // Parse the input format shown in the problem.\n  // TODO: implement the solution\n  printf(\"\\n\");\n  return 0;\n}\n",
    "sql": "-- SQLite query. Tables and columns are described in the problem.\n-- TODO: write your query\n",
}


def _problem(slug, title, difficulty, topics, statement, examples, constraints, cases, prerequisites, hints):
    return {
        "slug": slug,
        "title": title,
        "difficulty": difficulty,
        "topics": topics,
        "statement": statement,
        "examples": examples,
        "constraints": constraints,
        "test_cases": cases,
        "starter_code": STARTER,
        "prerequisites": prerequisites,
        "hints": hints,
        "editorial": None,
        "published": True,
        "created_at": None,
        "updated_at": None,
    }


PROBLEMS = [
    _problem(
        "pair-sum", "Pair Sum", "Easy", ["Arrays", "Hashing"],
        "Given an integer array and a target, return the indices of two different values whose sum equals the target. Exactly one answer exists. Print the smaller index first.",
        [{"input": "4\n2 7 11 15\n9", "output": "0 1", "explanation": "The values at indices 0 and 1 sum to 9."}],
        ["2 <= n <= 100000", "Each input value is an integer", "An answer is guaranteed"],
        [{"input": "4\n2 7 11 15\n9", "output": "0 1", "visible": True}, {"input": "5\n3 2 4 8 7\n6", "output": "1 2", "visible": False}, {"input": "3\n-2 9 5\n3", "output": "0 2", "visible": False}],
        ["Arrays", "Hash maps"], ["For each value, ask whether its complement has already appeared.", "Store the first index for each value."],
    ),
    _problem(
        "valid-palindrome", "Valid Palindrome", "Easy", ["Strings", "Two Pointers"],
        "Given one line of text, determine whether it is a palindrome after removing every character that is not an ASCII letter or digit and ignoring letter case. Print true or false.",
        [{"input": "A man, a plan, a canal: Panama!", "output": "true", "explanation": "Ignoring punctuation and case gives amanaplanacanalpanama."}],
        ["0 <= text length <= 200000", "Input contains one line"],
        [{"input": "A man, a plan, a canal: Panama!", "output": "true", "visible": True}, {"input": "race a car", "output": "false", "visible": False}, {"input": "!!!", "output": "true", "visible": False}],
        ["Strings", "Two pointers"], ["Normalize the input first, or compare from both ends while skipping punctuation.", "The empty normalized string is a palindrome."],
    ),
    _problem(
        "binary-search", "Binary Search", "Easy", ["Arrays", "Binary Search"],
        "Given a sorted array of distinct integers and a target, print its index. Print -1 if the target is absent. Input is n, a line of n integers, then the target.",
        [{"input": "6\n-1 0 3 5 9 12\n9", "output": "4", "explanation": "The target 9 is at index 4."}],
        ["0 <= n <= 200000", "Array is sorted in strictly increasing order"],
        [{"input": "6\n-1 0 3 5 9 12\n9", "output": "4", "visible": True}, {"input": "6\n-1 0 3 5 9 12\n2", "output": "-1", "visible": False}, {"input": "1\n7\n7", "output": "0", "visible": False}],
        ["Arrays", "Binary search"], ["Keep a search interval and discard half of it after each comparison.", "Use a midpoint formula that cannot overflow in fixed-width languages."],
    ),
    _problem(
        "maximum-subarray", "Maximum Subarray", "Medium", ["Arrays", "Dynamic Programming"],
        "Given an integer array, find the largest sum of any non-empty contiguous subarray. Input is n followed by n integers.",
        [{"input": "9\n-2 1 -3 4 -1 2 1 -5 4", "output": "6", "explanation": "The subarray [4, -1, 2, 1] has sum 6."}],
        ["1 <= n <= 200000", "-10000 <= values[i] <= 10000"],
        [{"input": "9\n-2 1 -3 4 -1 2 1 -5 4", "output": "6", "visible": True}, {"input": "5\n1 2 3 4 5", "output": "15", "visible": False}, {"input": "3\n-8 -2 -5", "output": "-2", "visible": False}],
        ["Arrays", "Dynamic programming"], ["At each position, either extend the previous subarray or start a new one.", "Track the best subarray seen separately from the running sum."],
    ),
    _problem(
        "balanced-brackets", "Balanced Brackets", "Medium", ["Strings", "Stacks"],
        "Given a string containing only (), [], and {}, determine whether every opening bracket is closed by the same type in the correct order. Print YES or NO.",
        [{"input": "{[()]}", "output": "YES", "explanation": "Every bracket closes in reverse order of opening."}],
        ["0 <= string length <= 200000", "Input contains only bracket characters"],
        [{"input": "{[()]}", "output": "YES", "visible": True}, {"input": "([)]", "output": "NO", "visible": False}, {"input": "((", "output": "NO", "visible": False}],
        ["Strings", "Stacks"], ["A stack naturally tracks the most recent opening bracket.", "Reject a closing bracket if the stack is empty or its type does not match."],
    ),
]
