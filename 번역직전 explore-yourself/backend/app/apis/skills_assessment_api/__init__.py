from fastapi import APIRouter
from pydantic import BaseModel
import databutton as db

router = APIRouter()

class SkillQuestion(BaseModel):
    id: int
    name: str
    description: str
    examples: list[str]
    levels: list[int]
    category: str

class Answer(BaseModel):
    questionId: int
    rating: int

class AnswersRequest(BaseModel):
    answers: list[Answer]

class SkillResult(BaseModel):
    questionId: int
    score: float
    name: str
    category: str
    description: str

class CalculateResultsData(BaseModel):
    results: list[SkillResult]

def categorize_skill(name: str) -> str:
    # Map skill areas to categories
    basic = ['Reading', 'Writing', 'Speaking', 'Listening', 'Mathematics', 'Science']
    complex = ['Critical Thinking', 'Active Learning', 'Learning Strategies', 'Monitoring']
    social = ['Social Perceptiveness', 'Coordination', 'Persuasion', 'Negotiation', 'Instructing', 'Service']
    technical = ['Equipment Selection', 'Installation', 'Programming', 'Quality Control', 'Operation and Control', 'Equipment Maintenance']
    systems = ['Systems Analysis', 'Systems Evaluation', 'Judgment and Decision Making', 'Time Management']
    resource = ['Management of Financial Resources', 'Management of Material Resources', 'Management of Personnel Resources']
    
    for category, items in [
        ('Basic Skills', basic),
        ('Complex Problem Solving', complex),
        ('Social Skills', social),
        ('Technical Skills', technical),
        ('Systems Skills', systems),
        ('Resource Management', resource)
    ]:
        if any(item.lower() in name.lower() for item in items):
            return category
    
    return 'Other'

def parse_skill_questions():
    raw_data = db.storage.text.get("skills-cleaned-1-txt")
    questions = []
    current_question = None
    question_id = 1

    for line in raw_data.split('\n'):
        line = line.strip()
        if not line:
            continue

        if line.startswith('Element Name:'):
            if current_question:
                questions.append(current_question)
            name = line.replace('Element Name:', '').strip()
            current_question = {
                'id': question_id,
                'name': name,
                'description': '',
                'examples': [],
                'levels': [],
                'category': ''
            }
            current_question['category'] = categorize_skill(name)
            question_id += 1
        elif line.startswith('Description:'):
            current_question['description'] = line.replace('Description:', '').strip()
        elif line == 'Level Examples:':
            continue  # Skip this line
        elif line.startswith('Level '):
            try:
                level_str = line.split(':')[0].replace('Level ', '').strip()
                example = line.split(':', 1)[1].strip()
                current_question['levels'].append(int(level_str))
                current_question['examples'].append(example)
            except (ValueError, IndexError) as e:
                print(f"Error parsing line: {line}")
                raise e

    if current_question:
        questions.append(current_question)

    return questions

@router.get("/get_skill_questions")
def get_skill_questions() -> list[SkillQuestion]:
    """Get all skill assessment questions"""
    questions = parse_skill_questions()
    return [SkillQuestion(**q) for q in questions]

@router.post("/calculate_skill_results")
def calculate_skill_results(body: AnswersRequest) -> CalculateResultsData:
    """Calculate skill assessment results based on answers"""
    questions = parse_skill_questions()
    question_map = {q['id']: q for q in questions}
    
    results = []
    for answer in body.answers:
        question = question_map[answer.questionId]
        # Simple scoring for now - just return the rating as the score
        results.append(SkillResult(
            questionId=answer.questionId,
            score=answer.rating,
            name=question['name'],
            category=question['category'],
            description=question['description']
        ))
    
    return CalculateResultsData(results=results)
