from fastapi import FastAPI, APIRouter, HTTPException, File, UploadFile, Form
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone
import pandas as pd
import io


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Define Models
class ProjectPlan(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    plan_id: str = Field(default_factory=lambda: str(uuid.uuid4())[:8].upper())
    title: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    
    # Plan sections
    title_sheet: Dict[str, Any] = Field(default_factory=dict)
    revision_history: Dict[str, Any] = Field(default_factory=dict)
    definitions_references: Dict[str, Any] = Field(default_factory=dict)
    project_introduction: Dict[str, Any] = Field(default_factory=dict)
    resource_plan: Dict[str, Any] = Field(default_factory=dict)
    pmc_objectives: Dict[str, Any] = Field(default_factory=dict)
    quality_management: Dict[str, Any] = Field(default_factory=dict)
    dar_tailoring: Dict[str, Any] = Field(default_factory=dict)
    risk_management: Dict[str, Any] = Field(default_factory=dict)
    opportunity_management: Dict[str, Any] = Field(default_factory=dict)
    configuration_management: Dict[str, Any] = Field(default_factory=dict)
    deliverables: Dict[str, Any] = Field(default_factory=dict)
    skill_matrix: Dict[str, Any] = Field(default_factory=dict)
    supplier_management: Dict[str, Any] = Field(default_factory=dict)

class ProjectPlanCreate(BaseModel):
    title: str
    
class ProjectPlanUpdate(BaseModel):
    title: Optional[str] = None
    title_sheet: Optional[Dict[str, Any]] = None
    revision_history: Optional[Dict[str, Any]] = None
    definitions_references: Optional[Dict[str, Any]] = None
    project_introduction: Optional[Dict[str, Any]] = None
    resource_plan: Optional[Dict[str, Any]] = None
    pmc_objectives: Optional[Dict[str, Any]] = None
    quality_management: Optional[Dict[str, Any]] = None
    dar_tailoring: Optional[Dict[str, Any]] = None
    risk_management: Optional[Dict[str, Any]] = None
    opportunity_management: Optional[Dict[str, Any]] = None
    configuration_management: Optional[Dict[str, Any]] = None
    deliverables: Optional[Dict[str, Any]] = None
    skill_matrix: Optional[Dict[str, Any]] = None
    supplier_management: Optional[Dict[str, Any]] = None

def prepare_for_mongo(data):
    """Convert datetime objects to ISO strings for MongoDB storage"""
    if isinstance(data, dict):
        return {k: prepare_for_mongo(v) for k, v in data.items()}
    elif isinstance(data, list):
        return [prepare_for_mongo(item) for item in data]
    elif isinstance(data, datetime):
        return data.isoformat()
    return data

def parse_from_mongo(item):
    """Parse datetime strings back from MongoDB"""
    if isinstance(item, dict):
        if 'created_at' in item and isinstance(item['created_at'], str):
            item['created_at'] = datetime.fromisoformat(item['created_at'].replace('Z', '+00:00'))
        if 'updated_at' in item and isinstance(item['updated_at'], str):
            item['updated_at'] = datetime.fromisoformat(item['updated_at'].replace('Z', '+00:00'))
        return {k: parse_from_mongo(v) for k, v in item.items()}
    elif isinstance(item, list):
        return [parse_from_mongo(sub_item) for sub_item in item]
    return item

def process_excel_data(excel_data):
    """Process uploaded Excel file and extract data"""
    try:
        plan_data = {
            'title_sheet': {},
            'revision_history': {},
            'definitions_references': {},
            'project_introduction': {},
            'resource_plan': {},
            'pmc_objectives': {},
            'quality_management': {},
            'dar_tailoring': {},
            'risk_management': {},
            'opportunity_management': {},
            'configuration_management': {},
            'deliverables': {},
            'skill_matrix': {},
            'supplier_management': {}
        }
        
        # Map sheet names to our data structure
        sheet_mapping = {
            'Title Sheet': 'title_sheet',
            'Revision History': 'revision_history',
            'Definitions and References': 'definitions_references',
            'Project Introduction': 'project_introduction',
            'Resource Plan and Estimation': 'resource_plan',
            'PMC and Project Objectives': 'pmc_objectives',
            'Quality Management': 'quality_management',
            'DAR, Tailoring and Release Plan': 'dar_tailoring',
            'Risk Management': 'risk_management',
            'Opportunity Management': 'opportunity_management',
            'Configuration Management': 'configuration_management',
            'List of Deliverables': 'deliverables',
            'Skill Matrix': 'skill_matrix',
            'Supplie Agreement Management': 'supplier_management'
        }
        
        for sheet_name, data_key in sheet_mapping.items():
            if sheet_name in excel_data.sheet_names:
                try:
                    df = pd.read_excel(excel_data, sheet_name=sheet_name, header=None)
                    
                    # Convert DataFrame to structured data
                    sheet_data = {'rows': [], 'non_empty_cells': {}}
                    
                    for i in range(len(df)):
                        row_data = []
                        for j in range(len(df.columns)):
                            cell_value = df.iloc[i, j]
                            if pd.notna(cell_value):
                                cell_str = str(cell_value).strip()
                                if cell_str:
                                    sheet_data['non_empty_cells'][f'{i},{j}'] = cell_str
                                row_data.append(cell_str)
                            else:
                                row_data.append('')
                        sheet_data['rows'].append(row_data)
                    
                    plan_data[data_key] = sheet_data
                except Exception as e:
                    logger.error(f"Error processing sheet {sheet_name}: {e}")
                    plan_data[data_key] = {'error': str(e)}
        
        return plan_data
        
    except Exception as e:
        logger.error(f"Error processing Excel file: {e}")
        raise HTTPException(status_code=400, detail=f"Error processing Excel file: {e}")

# API Routes

@api_router.get("/")
async def root():
    return {"message": "Project Plan Management API"}

@api_router.post("/plans", response_model=ProjectPlan)
async def create_plan(plan_data: ProjectPlanCreate):
    """Create a new project plan"""
    plan_dict = plan_data.dict()
    plan_obj = ProjectPlan(**plan_dict)
    
    # Prepare for MongoDB
    plan_mongo = prepare_for_mongo(plan_obj.dict())
    result = await db.plans.insert_one(plan_mongo)
    
    if result.inserted_id:
        return plan_obj
    else:
        raise HTTPException(status_code=500, detail="Failed to create plan")

@api_router.post("/plans/upload")
async def upload_plan_from_excel(
    file: UploadFile = File(...),
    title: str = Form(...)
):
    """Upload and create a plan from Excel file"""
    if not file.filename.endswith(('.xlsx', '.xls')):
        raise HTTPException(status_code=400, detail="File must be an Excel file (.xlsx or .xls)")
    
    try:
        # Read the uploaded Excel file
        content = await file.read()
        excel_data = pd.ExcelFile(io.BytesIO(content))
        
        # Process Excel data
        plan_sections = process_excel_data(excel_data)
        
        # Create plan object
        plan_obj = ProjectPlan(
            title=title,
            **plan_sections
        )
        
        # Save to MongoDB
        plan_mongo = prepare_for_mongo(plan_obj.dict())
        result = await db.plans.insert_one(plan_mongo)
        
        if result.inserted_id:
            return {"message": "Plan uploaded successfully", "plan_id": plan_obj.plan_id, "id": plan_obj.id}
        else:
            raise HTTPException(status_code=500, detail="Failed to save plan")
            
    except Exception as e:
        logger.error(f"Error uploading plan: {e}")
        raise HTTPException(status_code=500, detail=f"Error uploading plan: {e}")

@api_router.get("/plans", response_model=List[ProjectPlan])
async def get_plans():
    """Get all project plans"""
    plans = await db.plans.find().to_list(1000)
    return [ProjectPlan(**parse_from_mongo(plan)) for plan in plans]

@api_router.get("/plans/{plan_id}", response_model=ProjectPlan)
async def get_plan(plan_id: str):
    """Get a specific project plan by plan_id"""
    plan = await db.plans.find_one({"plan_id": plan_id})
    if plan:
        return ProjectPlan(**parse_from_mongo(plan))
    else:
        raise HTTPException(status_code=404, detail="Plan not found")

@api_router.put("/plans/{plan_id}", response_model=ProjectPlan)
async def update_plan(plan_id: str, plan_update: ProjectPlanUpdate):
    """Update a project plan"""
    # Get existing plan
    existing_plan = await db.plans.find_one({"plan_id": plan_id})
    if not existing_plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    
    # Update fields
    update_data = plan_update.dict(exclude_unset=True)
    update_data['updated_at'] = datetime.now(timezone.utc)
    
    # Prepare for MongoDB
    update_mongo = prepare_for_mongo(update_data)
    
    result = await db.plans.update_one(
        {"plan_id": plan_id}, 
        {"$set": update_mongo}
    )
    
    if result.modified_count:
        # Fetch and return updated plan
        updated_plan = await db.plans.find_one({"plan_id": plan_id})
        return ProjectPlan(**parse_from_mongo(updated_plan))
    else:
        raise HTTPException(status_code=500, detail="Failed to update plan")

@api_router.delete("/plans/{plan_id}")
async def delete_plan(plan_id: str):
    """Delete a project plan"""
    result = await db.plans.delete_one({"plan_id": plan_id})
    if result.deleted_count:
        return {"message": "Plan deleted successfully"}
    else:
        raise HTTPException(status_code=404, detail="Plan not found")

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()