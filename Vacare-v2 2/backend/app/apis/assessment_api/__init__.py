from fastapi import APIRouter
from pydantic import BaseModel
from typing import List, Dict
import databutton as db

router = APIRouter()

def categorize_ability(name: str) -> str:
    # Map ability areas to categories
    cognitive = ['Written', 'Oral', 'Fluency', 'Originality', 'Problem Sensitivity', 'Deductive', 'Inductive', 
                'Information Ordering', 'Category Flexibility', 'Mathematical', 'Number', 'Memorization', 
                'Time Sharing', 'Speed of Closure', 'Flexibility of Closure', 'Spatial', 'Visualization', 
                'Perceptual', 'Selective Attention']
    
    physical = ['Static Strength', 'Explosive Strength', 'Dynamic Strength', 'Trunk Strength', 
               'Stamina', 'Extent Flexibility', 'Dynamic Flexibility', 'Gross Body Coordination', 
               'Gross Body Equilibrium']
    
    psychomotor = ['Control Precision', 'Multilimb Coordination', 'Response Orientation', 'Rate Control', 
                  'Reaction Time', 'Arm-Hand Steadiness', 'Manual Dexterity', 'Finger Dexterity', 
                  'Wrist-Finger Speed', 'Speed of Limb Movement']
    
    sensory = ['Near Vision', 'Far Vision', 'Visual Color Discrimination', 'Night Vision', 'Peripheral Vision', 
              'Depth Perception', 'Glare Sensitivity', 'Hearing Sensitivity', 'Auditory Attention', 
              'Sound Localization', 'Speech Recognition', 'Speech Clarity']
    
    for category, items in [
        ('Cognitive', cognitive),
        ('Physical', physical),
        ('Psychomotor', psychomotor),
        ('Sensory', sensory)
    ]:
        if any(item.lower() in name.lower() for item in items):
            return category
    
    return 'Other'

def parse_ability_questions():
    raw_data = db.storage.text.get("abilty-cleaned-1-txt")
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
            current_question['category'] = categorize_ability(name)
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

# Legacy hardcoded data - can be removed when confidence in parsing is high
# Keeping for reference during initial implementation
_ABILITY_QUESTIONS_LEGACY = [
    {
        "id": 1,
        "name": "Near Vision",
        "category": "Sensory",
        "description": "The ability to see details at close range (within a few feet of the observer).",
        "examples": ["Detect minor defects in a diamond", "Read the fine print of a legal document", "Read indicators on the dashboard of a car"],
        "levels": [85, 71, 28]
    },
    {
        "id": 2,
        "name": "Multilimb Coordination",
        "category": "Psychomotor",
        "description": "The ability to coordinate two or more limbs (for example, two arms, two legs, or one leg and one arm) while sitting, standing, or lying down. It does not involve performing the activities while the whole body is in motion.",
        "examples": ["Play the drum set in a jazz band", "Operate a forklift truck in a warehouse", "Row a boat"],
        "levels": [85, 57, 28]
    },
    {
        "id": 3,
        "name": "Static Strength",
        "category": "Physical",
        "description": "The ability to exert maximum muscle force to lift, push, pull, or carry objects.",
        "examples": ["Lift heavy construction materials", "Push a stalled car", "Carry a small suitcase"],
        "levels": [85, 57, 28]
    },
    {
        "id": 4,
        "name": "Explosive Strength",
        "category": "Physical",
        "description": "The ability to use short bursts of muscle force to propel oneself (as in jumping or sprinting), or to throw an object.",
        "examples": ["Perform a gymnastics routine", "Throw a baseball", "Jump over a ditch"],
        "levels": [85, 57, 28]
    },
    {
        "id": 5,
        "name": "Extent Flexibility",
        "category": "Physical",
        "description": "The ability to bend, stretch, twist, or reach with your body, arms, and/or legs.",
        "examples": ["Perform ballet movements", "Load and unload trucks", "Reach for a book on a shelf"],
        "levels": [85, 57, 28]
    },
    {
        "id": 6,
        "name": "Dynamic Flexibility",
        "category": "Physical",
        "description": "The ability to quickly and repeatedly bend, stretch, twist, or reach out with your body, arms, and/or legs.",
        "examples": ["Perform martial arts moves", "Load boxes onto a conveyor belt", "Do calisthenics exercises"],
        "levels": [85, 57, 28]
    },
    {
        "id": 7,
        "name": "Gross Body Coordination",
        "category": "Physical",
        "description": "The ability to coordinate the movement of your arms, legs, and torso together when the whole body is in motion.",
        "examples": ["Perform a dance routine", "Play basketball", "Ride a bicycle"],
        "levels": [85, 57, 28]
    },
    {
        "id": 8,
        "name": "Gross Body Equilibrium",
        "category": "Physical",
        "description": "The ability to keep or regain your body balance or stay upright when in an unstable position.",
        "examples": ["Walk on a tightrope", "Work on scaffolding", "Walk on an icy sidewalk"],
        "levels": [85, 57, 28]
    },
    {
        "id": 9,
        "name": "Stamina",
        "category": "Physical",
        "description": "The ability to exert yourself physically over long periods of time without getting winded or out of breath.",
        "examples": ["Run a marathon", "Bike long distances", "Walk up several flights of stairs"],
        "levels": [85, 57, 28]
    },
    {
        "id": 10,
        "name": "Dynamic Strength",
        "category": "Physical",
        "description": "The ability to exert muscle force repeatedly or continuously over time. This involves muscular endurance and resistance to muscle fatigue.",
        "examples": ["Perform repeated sit-ups", "Climb a rope", "Do yard work"],
        "levels": [85, 57, 28]
    },
    {
        "id": 11,
        "name": "Trunk Strength",
        "category": "Physical",
        "description": "The ability to use your abdominal and lower back muscles to support part of the body repeatedly or continuously over time without 'giving out' or fatiguing.",
        "examples": ["Perform gymnastics", "Load heavy boxes", "Shovel snow"],
        "levels": [85, 57, 28]
    },
    {
        "id": 12,
        "name": "Speed of Limb Movement",
        "category": "Psychomotor",
        "description": "The ability to quickly move arms and legs.",
        "examples": ["Play the drums", "Type quickly", "Operate a sewing machine"],
        "levels": [85, 57, 28]
    },
    {
        "id": 13,
        "name": "Rate Control",
        "category": "Psychomotor",
        "description": "The ability to time your movements or the movement of a piece of equipment in anticipation of changes in the speed and/or direction of a moving object or scene.",
        "examples": ["Land an airplane", "Drive in heavy traffic", "Play a video game"],
        "levels": [85, 57, 28]
    },
    {
        "id": 14,
        "name": "Reaction Time",
        "category": "Psychomotor",
        "description": "The ability to quickly respond (with the hand, finger, or foot) to a signal (sound, light, picture) when it appears.",
        "examples": ["Catch a ball", "Hit the brakes when a car stops", "Press a button in response to a light"],
        "levels": [85, 57, 28]
    },
    {
        "id": 15,
        "name": "Response Orientation",
        "category": "Psychomotor",
        "description": "The ability to choose quickly between two or more movements in response to two or more different signals (lights, sounds, pictures). It includes the speed with which the correct response is started with the hand, foot, or other body part.",
        "examples": ["Play a fast-paced video game", "Operate complex machinery", "Drive in city traffic"],
        "levels": [85, 57, 28]
    },
    {
        "id": 16,
        "name": "Arm-Hand Steadiness",
        "category": "Psychomotor",
        "description": "The ability to keep your hand and arm steady while moving your arm or while holding your arm and hand in one position.",
        "examples": ["Perform microsurgery", "Thread a needle", "Paint a picture"],
        "levels": [85, 57, 28]
    },
    {
        "id": 17,
        "name": "Manual Dexterity",
        "category": "Psychomotor",
        "description": "The ability to quickly move your hand, your hand together with your arm, or your two hands to grasp, manipulate, or assemble objects.",
        "examples": ["Perform detailed assembly work", "Pack boxes quickly", "Sort mail"],
        "levels": [85, 57, 28]
    },
    {
        "id": 18,
        "name": "Finger Dexterity",
        "category": "Psychomotor",
        "description": "The ability to make precisely coordinated movements of the fingers of one or both hands to grasp, manipulate, or assemble very small objects.",
        "examples": ["Assemble small electronic parts", "Tie a small knot", "Pick up a paper clip"],
        "levels": [85, 57, 28]
    },
    {
        "id": 19,
        "name": "Wrist-Finger Speed",
        "category": "Psychomotor",
        "description": "The ability to make fast, simple, repeated movements of the fingers, hands, and wrists.",
        "examples": ["Play a piano piece", "Type quickly", "Sort cards"],
        "levels": [85, 57, 28]
    },
    {
        "id": 20,
        "name": "Control Precision",
        "category": "Psychomotor",
        "description": "The ability to quickly and repeatedly adjust the controls of a machine or a vehicle to exact positions.",
        "examples": ["Operate a crane", "Use a joystick to control equipment", "Adjust the volume on a radio"],
        "levels": [85, 57, 28]
    },
    {
        "id": 21,
        "name": "Far Vision",
        "category": "Sensory",
        "description": "The ability to see details at a distance.",
        "examples": ["Spot approaching aircraft", "Read a street sign", "Watch a movie in a theater"],
        "levels": [85, 57, 28]
    },
    {
        "id": 22,
        "name": "Visual Color Discrimination",
        "category": "Sensory",
        "description": "The ability to match or detect differences between colors, including shades of color and brightness.",
        "examples": ["Match paint colors", "Grade fruits and vegetables", "Sort colored objects"],
        "levels": [85, 57, 28]
    },
    {
        "id": 23,
        "name": "Night Vision",
        "category": "Sensory",
        "description": "The ability to see under low light conditions.",
        "examples": ["Drive at night", "Read in dim light", "Walk in a dark room"],
        "levels": [85, 57, 28]
    },
    {
        "id": 24,
        "name": "Peripheral Vision",
        "category": "Sensory",
        "description": "The ability to see objects or movement of objects to one's side when the eyes are looking ahead.",
        "examples": ["Monitor multiple screens", "Drive in traffic", "Watch for movement while reading"],
        "levels": [85, 57, 28]
    },
    {
        "id": 25,
        "name": "Depth Perception",
        "category": "Sensory",
        "description": "The ability to judge which of several objects is closer or farther away from you, or to judge the distance between you and an object.",
        "examples": ["Park a car", "Thread a needle", "Catch a ball"],
        "levels": [85, 57, 28]
    },
    {
        "id": 26,
        "name": "Glare Sensitivity",
        "category": "Sensory",
        "description": "The ability to see objects in the presence of glare or bright lighting.",
        "examples": ["Drive into bright sunlight", "Work with shiny materials", "Read a computer screen with glare"],
        "levels": [85, 57, 28]
    },
    {
        "id": 27,
        "name": "Hearing Sensitivity",
        "category": "Sensory",
        "description": "The ability to detect or tell the differences between sounds that vary in pitch and loudness.",
        "examples": ["Tune musical instruments", "Diagnose engine problems", "Listen to conversations in a noisy room"],
        "levels": [85, 57, 28]
    },
    {
        "id": 28,
        "name": "Auditory Attention",
        "category": "Sensory",
        "description": "The ability to focus on a single source of sound in the presence of other distracting sounds.",
        "examples": ["Listen to air traffic control", "Follow one conversation in a crowd", "Hear a phone ring in a noisy room"],
        "levels": [85, 57, 28]
    },
    {
        "id": 29,
        "name": "Sound Localization",
        "category": "Sensory",
        "description": "The ability to tell the direction from which a sound originated.",
        "examples": ["Locate emergency vehicle sirens", "Find a ringing phone", "Identify direction of someone calling"],
        "levels": [85, 57, 28]
    },
    {
        "id": 30,
        "name": "Speech Recognition",
        "category": "Sensory",
        "description": "The ability to identify and understand the speech of another person.",
        "examples": ["Understand foreign accents", "Take phone messages", "Follow verbal instructions"],
        "levels": [85, 57, 28]
    },
    {
        "id": 31,
        "name": "Speech Clarity",
        "category": "Sensory",
        "description": "The ability to speak clearly so others can understand you.",
        "examples": ["Give a public speech", "Make announcements", "Talk on the phone"],
        "levels": [85, 57, 28]
    },
    {
        "id": 32,
        "name": "Written Comprehension",
        "category": "Cognitive",
        "description": "The ability to read and understand information and ideas presented in writing.",
        "examples": ["Read scientific papers", "Understand technical manuals", "Read a newspaper"],
        "levels": [85, 57, 28]
    },
    {
        "id": 33,
        "name": "Written Expression",
        "category": "Cognitive",
        "description": "The ability to communicate information and ideas in writing so others will understand.",
        "examples": ["Write a research paper", "Draft business correspondence", "Write simple instructions"],
        "levels": [85, 57, 28]
    },
    {
        "id": 34,
        "name": "Oral Comprehension",
        "category": "Cognitive",
        "description": "The ability to listen to and understand information and ideas presented through spoken words and sentences.",
        "examples": ["Follow complex verbal instructions", "Understand a lecture", "Follow simple directions"],
        "levels": [85, 57, 28]
    },
    {
        "id": 35,
        "name": "Oral Expression",
        "category": "Cognitive",
        "description": "The ability to communicate information and ideas in speaking so others will understand.",
        "examples": ["Give a scientific presentation", "Explain technical concepts", "Give simple directions"],
        "levels": [85, 57, 28]
    },
    {
        "id": 36,
        "name": "Fluency of Ideas",
        "category": "Cognitive",
        "description": "The ability to come up with a number of ideas about a topic (the number of ideas is important, not their quality, correctness, or creativity).",
        "examples": ["Brainstorm solutions", "Generate story ideas", "List possible uses for objects"],
        "levels": [85, 57, 28]
    },
    {
        "id": 37,
        "name": "Originality",
        "category": "Cognitive",
        "description": "The ability to come up with unusual or clever ideas about a given topic or situation, or to develop creative ways to solve a problem.",
        "examples": ["Design new products", "Create advertising campaigns", "Solve puzzles"],
        "levels": [85, 57, 28]
    },
    {
        "id": 38,
        "name": "Problem Sensitivity",
        "category": "Cognitive",
        "description": "The ability to tell when something is wrong or is likely to go wrong. It does not involve solving the problem, only recognizing there is a problem.",
        "examples": ["Diagnose mechanical problems", "Spot errors in documents", "Notice when something is missing"],
        "levels": [85, 57, 28]
    },
    {
        "id": 39,
        "name": "Deductive Reasoning",
        "category": "Cognitive",
        "description": "The ability to apply general rules to specific problems to produce answers that make sense.",
        "examples": ["Solve complex math problems", "Diagnose illnesses", "Follow cooking instructions"],
        "levels": [85, 57, 28]
    },
    {
        "id": 40,
        "name": "Inductive Reasoning",
        "category": "Cognitive",
        "description": "The ability to combine pieces of information to form general rules or conclusions (includes finding a relationship among seemingly unrelated events).",
        "examples": ["Develop scientific theories", "Identify patterns in data", "Solve simple puzzles"],
        "levels": [85, 57, 28]
    },
    {
        "id": 41,
        "name": "Information Ordering",
        "category": "Cognitive",
        "description": "The ability to arrange things or actions in a certain order or pattern according to a specific rule or set of rules (e.g., patterns of numbers, letters, words, pictures, mathematical operations).",
        "examples": ["Organize complex schedules", "Arrange files alphabetically", "Follow a recipe"],
        "levels": [85, 57, 28]
    },
    {
        "id": 42,
        "name": "Category Flexibility",
        "category": "Cognitive",
        "description": "The ability to generate or use different sets of rules for combining or grouping things in different ways.",
        "examples": ["Create classification systems", "Organize data multiple ways", "Sort objects by different criteria"],
        "levels": [85, 57, 28]
    },
    {
        "id": 43,
        "name": "Mathematical Reasoning",
        "category": "Cognitive",
        "description": "The ability to choose the right mathematical methods or formulas to solve a problem.",
        "examples": ["Solve calculus problems", "Calculate business projections", "Figure out a tip"],
        "levels": [85, 57, 28]
    },
    {
        "id": 44,
        "name": "Number Facility",
        "category": "Cognitive",
        "description": "The ability to add, subtract, multiply, or divide quickly and correctly.",
        "examples": ["Calculate complex equations", "Balance accounts", "Make change"],
        "levels": [85, 57, 28]
    },
    {
        "id": 45,
        "name": "Memorization",
        "category": "Cognitive",
        "description": "The ability to remember information such as words, numbers, pictures, and procedures.",
        "examples": ["Remember complex formulas", "Memorize scripts", "Learn new vocabulary"],
        "levels": [85, 57, 28]
    },
    {
        "id": 46,
        "name": "Time Sharing",
        "category": "Cognitive",
        "description": "The ability to shift back and forth between two or more activities or sources of information (such as speech, sounds, touch, or other sources).",
        "examples": ["Monitor multiple displays", "Drive while talking", "Cook multiple dishes"],
        "levels": [85, 57, 28]
    },
    {
        "id": 47,
        "name": "Speed of Closure",
        "category": "Cognitive",
        "description": "The ability to quickly make sense of, combine, and organize information into meaningful patterns.",
        "examples": ["Recognize faces quickly", "Read blurry text", "Complete simple puzzles"],
        "levels": [85, 57, 28]
    },
    {
        "id": 48,
        "name": "Flexibility of Closure",
        "category": "Cognitive",
        "description": "The ability to identify or detect a known pattern (a figure, object, word, or sound) that is hidden in other distracting material.",
        "examples": ["Find objects in cluttered scenes", "Read camouflaged text", "Spot simple patterns"],
        "levels": [85, 57, 28]
    },
    {
        "id": 49,
        "name": "Spatial Orientation",
        "category": "Cognitive",
        "description": "The ability to know your location in relation to the environment or to know where other objects are in relation to you.",
        "examples": ["Navigate using a map", "Find your way in a building", "Arrange furniture in a room"],
        "levels": [85, 57, 28]
    },
    {
        "id": 50,
        "name": "Visualization",
        "category": "Cognitive",
        "description": "The ability to imagine how something will look after it is moved around or when its parts are moved or rearranged.",
        "examples": ["Design building layouts", "Plan furniture arrangement", "Solve simple puzzles"],
        "levels": [85, 57, 28]
    },
    {
        "id": 51,
        "name": "Perceptual Speed",
        "category": "Cognitive",
        "description": "The ability to quickly and accurately compare similarities and differences among sets of letters, numbers, objects, pictures, or patterns.",
        "examples": ["Proofread documents", "Check for differences", "Match simple patterns"],
        "levels": [85, 57, 28]
    },
    {
        "id": 52,
        "name": "Selective Attention",
        "category": "Cognitive",
        "description": "The ability to concentrate on a task over a period of time without being distracted.",
        "examples": ["Monitor security cameras", "Inspect products", "Read for long periods"],
        "levels": [85, 57, 28]
    }
]



class AbilityQuestion(BaseModel):
    id: int
    name: str
    category: str
    description: str
    examples: List[str]
    levels: List[int]

class AbilityAnswer(BaseModel):
    questionId: int
    rating: int  # 0-100 scale

class AbilityAnswersRequest(BaseModel):
    answers: List[AbilityAnswer]

class AbilityResultItem(BaseModel):
    name: str
    category: str
    score: int
    description: str

class AbilityAssessmentResult(BaseModel):
    results: List[AbilityResultItem]
    topAbilities: List[str]
    categoryAverages: Dict[str, float]

@router.get("/ability-questions")
def get_ability_questions() -> List[AbilityQuestion]:
    """Get all ability assessment questions"""
    questions = parse_ability_questions()
    return [AbilityQuestion(**q) for q in questions]

@router.post("/calculate-ability-results")
def calculate_ability_results(answers: AbilityAnswersRequest) -> AbilityAssessmentResult:
    """Calculate ability assessment results based on answers"""
    results = []
    category_scores = {}
    category_counts = {}
    
    # Get questions from parsed data
    questions = parse_ability_questions()
    question_map = {q['id']: q for q in questions}

    for answer in answers.answers:
        question = question_map[answer.questionId]
        score = answer.rating

        # Add to category averages
        if question["category"] not in category_scores:
            category_scores[question["category"]] = 0
            category_counts[question["category"]] = 0
        category_scores[question["category"]] += score
        category_counts[question["category"]] += 1

        results.append(
            AbilityResultItem(
                name=question["name"],
                category=question["category"],
                score=score,
                description=question["description"]
            )
        )

    # Calculate category averages
    category_averages = {
        category: scores / category_counts[category]
        for category, scores in category_scores.items()
    }

    # Sort by score and get top abilities
    sorted_results = sorted(results, key=lambda x: x.score, reverse=True)
    top_abilities = [r.name for r in sorted_results[:5]]

    return AbilityAssessmentResult(
        results=results,
        topAbilities=top_abilities,
        categoryAverages=category_averages
    )


# Sample questions based on O*NET Interest Profiler
INTEREST_QUESTIONS = [
    # Realistic Questions (R)
    {"id": 1, "text": "Build kitchen cabinets", "category": "Realistic"},
    {"id": 2, "text": "Drive a truck to deliver packages to offices and homes", "category": "Realistic"},
    {"id": 3, "text": "Lay brick or tile", "category": "Realistic"},
    {"id": 4, "text": "Test the quality of parts before shipment", "category": "Realistic"},
    {"id": 5, "text": "Repair household appliances", "category": "Realistic"},
    {"id": 6, "text": "Repair and install locks", "category": "Realistic"},
    {"id": 7, "text": "Raise fish in a fish hatchery", "category": "Realistic"},
    {"id": 8, "text": "Set up and operate machines to make products", "category": "Realistic"},
    {"id": 9, "text": "Assemble electronic parts", "category": "Realistic"},
    {"id": 10, "text": "Put out forest fires", "category": "Realistic"},

    # Investigative Questions (I)
    {"id": 11, "text": "Develop a new medicine", "category": "Investigative"},
    {"id": 12, "text": "Investigate the cause of a fire", "category": "Investigative"},
    {"id": 13, "text": "Study ways to reduce water pollution", "category": "Investigative"},
    {"id": 14, "text": "Develop a way to better predict the weather", "category": "Investigative"},
    {"id": 15, "text": "Conduct chemical experiments", "category": "Investigative"},
    {"id": 16, "text": "Work in a biology lab", "category": "Investigative"},
    {"id": 17, "text": "Study the movement of planets", "category": "Investigative"},
    {"id": 18, "text": "Invent a replacement for sugar", "category": "Investigative"},
    {"id": 19, "text": "Examine blood samples using a microscope", "category": "Investigative"},
    {"id": 20, "text": "Do laboratory tests to identify diseases", "category": "Investigative"},

    # Artistic Questions (A)
    {"id": 21, "text": "Write books or plays", "category": "Artistic"},
    {"id": 22, "text": "Paint sets for plays", "category": "Artistic"},
    {"id": 23, "text": "Play a musical instrument", "category": "Artistic"},
    {"id": 24, "text": "Write scripts for movies or television shows", "category": "Artistic"},
    {"id": 25, "text": "Compose or arrange music", "category": "Artistic"},
    {"id": 26, "text": "Perform jazz or tap dance", "category": "Artistic"},
    {"id": 27, "text": "Draw pictures", "category": "Artistic"},
    {"id": 28, "text": "Sing in a band", "category": "Artistic"},
    {"id": 29, "text": "Create special effects for movies", "category": "Artistic"},
    {"id": 30, "text": "Edit movies", "category": "Artistic"},

    # Social Questions (S)
    {"id": 31, "text": "Teach an individual an exercise routine", "category": "Social"},
    {"id": 32, "text": "Teach children how to play sports", "category": "Social"},
    {"id": 33, "text": "Help people with personal or emotional problems", "category": "Social"},
    {"id": 34, "text": "Teach sign language to people who are deaf or hard of hearing", "category": "Social"},
    {"id": 35, "text": "Give career guidance to people", "category": "Social"},
    {"id": 36, "text": "Help conduct a group therapy session", "category": "Social"},
    {"id": 37, "text": "Perform rehabilitation therapy", "category": "Social"},
    {"id": 38, "text": "Take care of children at a day‑care center", "category": "Social"},
    {"id": 39, "text": "Do volunteer work at a non‑profit organization", "category": "Social"},
    {"id": 40, "text": "Teach a high‑school class", "category": "Social"},

    # Enterprising Questions (E)
    {"id": 41, "text": "Buy and sell stocks and bonds", "category": "Enterprising"},
    {"id": 42, "text": "Negotiate business contracts", "category": "Enterprising"},
    {"id": 43, "text": "Manage a retail store", "category": "Enterprising"},
    {"id": 44, "text": "Represent a client in a lawsuit", "category": "Enterprising"},
    {"id": 45, "text": "Operate a beauty salon or barber shop", "category": "Enterprising"},
    {"id": 46, "text": "Market a new line of clothing", "category": "Enterprising"},
    {"id": 47, "text": "Manage a department within a large company", "category": "Enterprising"},
    {"id": 48, "text": "Sell merchandise at a department store", "category": "Enterprising"},
    {"id": 49, "text": "Start your own business", "category": "Enterprising"},
    {"id": 50, "text": "Manage a clothing store", "category": "Enterprising"},

    # Conventional Questions (C)
    {"id": 51, "text": "Develop a spreadsheet using computer software", "category": "Conventional"},
    {"id": 52, "text": "Calculate the wages of employees", "category": "Conventional"},
    {"id": 53, "text": "Proofread records or forms", "category": "Conventional"},
    {"id": 54, "text": "Inventory supplies using a hand‑held computer", "category": "Conventional"},
    {"id": 55, "text": "Install software across computers on a large network", "category": "Conventional"},
    {"id": 56, "text": "Record rent payments", "category": "Conventional"},
    {"id": 57, "text": "Operate a calculator", "category": "Conventional"},
    {"id": 58, "text": "Keep inventory records", "category": "Conventional"},
    {"id": 59, "text": "Keep shipping and receiving records", "category": "Conventional"},
    {"id": 60, "text": "Stamp, sort, and distribute mail for an organization", "category": "Conventional"}
]

class Question(BaseModel):
    id: int
    text: str
    category: str

class Answer(BaseModel):
    questionId: int
    rating: int

class AnswersRequest(BaseModel):
    answers: List[Answer]

class ResultItem(BaseModel):
    category: str
    score: int
    description: str

class AssessmentResult(BaseModel):
    results: List[ResultItem]
    topCategories: List[str]

@router.get("/questions")
def get_questions() -> List[Question]:
    """Get all assessment questions"""
    return INTEREST_QUESTIONS

@router.post("/calculate-results")
def calculate_results(answers: AnswersRequest) -> AssessmentResult:
    """Calculate assessment results based on answers"""
    # Initialize scores
    scores = {
        "Realistic": 0,
        "Investigative": 0,
        "Artistic": 0,
        "Social": 0,
        "Enterprising": 0,
        "Conventional": 0
    }
    
    # Calculate scores
    for answer in answers.answers:
        question = next(q for q in INTEREST_QUESTIONS if q["id"] == answer.questionId)
        # Convert 1-5 rating to 0-4 scale (1->0, 2->1, 3->2, 4->3, 5->4)
        adjusted_score = answer.rating - 1
        scores[question["category"]] += adjusted_score
    
    # Create result items with descriptions
    descriptions = {
        "Realistic": "You like work activities that include practical, hands-on problems and solutions.",
        "Investigative": "You like work activities that have to do with ideas and thinking.",
        "Artistic": "You like work activities that deal with the artistic side of things.",
        "Social": "You like work activities that assist others and promote learning and personal development.",
        "Enterprising": "You like work activities that involve starting up and carrying out projects.",
        "Conventional": "You like work activities that follow set procedures and routines."
    }
    
    # Normalize scores to be out of 100
    # Each category has a different number of questions, so we need to account for that
    # The max score for each category is (number of questions) * 4
    num_questions_per_category = {
        "Realistic": 10,
        "Investigative": 10,
        "Artistic": 10,
        "Social": 10,
        "Enterprising": 10,
        "Conventional": 10
    }

    results = [
        ResultItem(
            category=category,
            score=round((score / (num_questions_per_category[category] * 4)) * 100),
            description=descriptions[category]
        )
        for category, score in scores.items()
    ]
    
    # Get top 3 categories
    top_categories = sorted(results, key=lambda x: x.score, reverse=True)[:3]
    
    return AssessmentResult(
        results=results,
        topCategories=[item.category for item in top_categories]
    )
