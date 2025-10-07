#!/usr/bin/env python3
"""
Test script to demonstrate the enhanced AI report generation with personality insights.

This shows how the new system provides deep, meaningful insights rather than just summarizing data.
"""

import sys
from pathlib import Path

sys.path.append(str(Path(__file__).resolve().parent))

from app.apis.career_reports import (
    _build_system_prompt,
    _build_user_payload,
    _load_assessment_element_definitions,
)


def test_element_definitions_loading():
    """Test that assessment element definitions are loaded correctly."""
    print("=" * 80)
    print("TESTING ELEMENT DEFINITIONS LOADING")
    print("=" * 80)

    definitions = _load_assessment_element_definitions()

    print(f"\nLoaded {len(definitions)} element definitions\n")

    # Show a few examples
    examples = ["Near Vision", "Design", "Critical Thinking"]
    for name in examples:
        if name in definitions:
            element = definitions[name]
            print(f"Element: {element['name']} (Type: {element['type']})")
            print(f"  Description: {element['description']}")
            print(f"  Examples: {', '.join(element['examples'][:2])}")
            print()


def test_enhanced_prompts():
    """Test the enhanced system prompt and user payload."""
    print("=" * 80)
    print("ENHANCED SYSTEM PROMPT")
    print("=" * 80)

    system_prompt = _build_system_prompt()
    print(system_prompt)
    print()

    print("=" * 80)
    print("USER PAYLOAD STRUCTURE")
    print("=" * 80)

    # Mock snapshot data
    mock_snapshot = {
        "interest": {
            "results": {
                "R": 45,
                "I": 72,
                "A": 58,
                "S": 65,
                "E": 38,
                "C": 42
            }
        },
        "ability": {
            "results": [
                {"name": "Originality", "score": 78},
                {"name": "Written Expression", "score": 82},
                {"name": "Oral Expression", "score": 68}
            ]
        }
    }

    mock_summary = {
        "completed_assessments": ["interest", "ability"],
        "data_quality": "Medium"
    }

    payload = _build_user_payload("test-user", mock_snapshot, mock_summary)

    print("\nKey sections of enhanced payload:")
    print("\n1. INSTRUCTIONS (excerpt):")
    print(payload["instructions"][:200] + "...")

    print("\n2. INTERPRETATION GUIDE:")
    for key, value in payload["context"]["interpretationGuide"].items():
        print(f"   {key}: {value}")

    print("\n3. ANALYSIS PROMPTS:")
    for i, prompt in enumerate(payload["context"]["analysisPrompts"][:3], 1):
        print(f"   {i}. {prompt}")

    print("\n4. REPORTING GUIDANCE (excerpt):")
    print(f"   Executive Summary: {payload['reportingGuidance']['executiveSummary']}")

    print("\n5. STYLE:")
    for key, value in payload["style"].items():
        print(f"   {key}: {value}")


def main():
    """Run all tests."""
    print("\n" + "=" * 80)
    print("ENHANCED AI REPORT GENERATION - PERSONALITY INSIGHTS")
    print("=" * 80 + "\n")

    print("This enhanced system provides deep personality insights by:")
    print("1. Loading detailed definitions of all assessment elements")
    print("2. Providing rich context about what scores mean")
    print("3. Guiding the AI to synthesize patterns and reveal insights")
    print("4. Focusing on meaning, fulfillment, and self-understanding\n")

    test_element_definitions_loading()
    test_enhanced_prompts()

    print("\n" + "=" * 80)
    print("SUMMARY")
    print("=" * 80)
    print("\nThe enhanced report generation system now:")
    print("✓ Loads assessment element definitions with examples")
    print("✓ Uses a psychology-focused system prompt")
    print("✓ Provides interpretation guides and analysis prompts")
    print("✓ Focuses on personality insights, not just data summaries")
    print("✓ Helps users understand who they are and what would fulfill them")
    print()


if __name__ == "__main__":
    main()
