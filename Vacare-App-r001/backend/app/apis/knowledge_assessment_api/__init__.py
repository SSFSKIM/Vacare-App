from fastapi import APIRouter
from pydantic import BaseModel
import databutton as db

router = APIRouter()

class KnowledgeQuestion(BaseModel):
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

class KnowledgeResult(BaseModel):
    questionId: int
    score: float
    name: str
    category: str
    description: str

class CalculateResultsData(BaseModel):
    results: list[KnowledgeResult]

def categorize_knowledge(name: str) -> str:
    # Map knowledge areas to categories
    technical = ['Design', 'Engineering', 'Building', 'Computers', 'Electronics', 'Mathematics', 'Physics']
    science = ['Chemistry', 'Biology', 'Psychology', 'Sociology', 'Geography']
    business = ['Economics', 'Sales', 'Marketing', 'Customer Service', 'Personnel', 'Management']
    arts = ['Fine Arts', 'History', 'Philosophy', 'Language', 'Communications']
    
    for category, items in [
        ('Technical', technical),
        ('Science', science),
        ('Business', business),
        ('Arts & Humanities', arts)
    ]:
        if any(item.lower() in name.lower() for item in items):
            return category
    
    return 'Other'

def parse_knowledge_questions():
    raw_data = db.storage.text.get("knowledge-cleaned-1-txt")
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
            current_question['category'] = categorize_knowledge(name)
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

@router.get("/get_knowledge_questions")
def get_knowledge_questions() -> list[KnowledgeQuestion]:
    """Get all knowledge assessment questions"""
    questions = parse_knowledge_questions()
    return [KnowledgeQuestion(**q) for q in questions]

@router.post("/calculate_knowledge_results")
def calculate_knowledge_results(body: AnswersRequest) -> CalculateResultsData:
    """Calculate knowledge assessment results based on answers"""
    questions = parse_knowledge_questions()
    question_map = {q['id']: q for q in questions}
    
    results = []
    for answer in body.answers:
        question = question_map[answer.questionId]
        # Simple scoring for now - just return the rating as the score
        results.append(KnowledgeResult(
            questionId=answer.questionId,
            score=answer.rating,
            name=question['name'],
            category=question['category'],
            description=question['description']
        ))
    
    return CalculateResultsData(results=results)
