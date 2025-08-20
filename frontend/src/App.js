import React, { useState, useEffect } from "react";
import "./App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import axios from "axios";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./components/ui/tabs";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "./components/ui/dialog";
import { Label } from "./components/ui/label";
import { Textarea } from "./components/ui/textarea";
import { Badge } from "./components/ui/badge";
import { Separator } from "./components/ui/separator";
import { Upload, FileText, Plus, Edit, Eye, Trash2, Download, Search } from "lucide-react";
import { useToast } from "./hooks/use-toast";
import { Toaster } from "./components/ui/toaster";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const PlanCard = ({ plan, onView, onEdit, onDelete }) => {
  return (
    <Card className="hover:shadow-lg transition-all duration-300 border-l-4 border-l-indigo-500">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg font-semibold text-gray-900">
              {plan.title || 'Untitled Plan'}
            </CardTitle>
            <CardDescription className="mt-1">
              Plan ID: <Badge variant="secondary">{plan.plan_id}</Badge>
            </CardDescription>
            <div className="mt-2 text-sm text-gray-500">
              Created: {new Date(plan.created_at).toLocaleDateString()}
            </div>
          </div>
          <div className="flex space-x-2">
            <Button size="sm" variant="outline" onClick={() => onView(plan)}>
              <Eye className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="outline" onClick={() => onEdit(plan)}>
              <Edit className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="destructive" onClick={() => onDelete(plan)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
    </Card>
  );
};

const CreatePlanDialog = ({ isOpen, onClose, onCreate, isUploading }) => {
  const [title, setTitle] = useState("");
  const [file, setFile] = useState(null);
  const [createMethod, setCreateMethod] = useState("manual"); // "manual" or "upload"

  const handleSubmit = (e) => {
    e.preventDefault();
    if (createMethod === "upload" && file) {
      onCreate(title, file);
    } else if (createMethod === "manual" && title.trim()) {
      onCreate(title);
    }
    setTitle("");
    setFile(null);
    setCreateMethod("manual");
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create New Project Plan</DialogTitle>
          <DialogDescription>
            Create a new project plan by entering details manually or uploading an Excel file.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="flex space-x-4">
            <Button
              variant={createMethod === "manual" ? "default" : "outline"}
              onClick={() => setCreateMethod("manual")}
              className="flex-1"
            >
              <FileText className="h-4 w-4 mr-2" />
              Manual Entry
            </Button>
            <Button
              variant={createMethod === "upload" ? "default" : "outline"}
              onClick={() => setCreateMethod("upload")}
              className="flex-1"
            >
              <Upload className="h-4 w-4 mr-2" />
              Upload Excel
            </Button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="title">Plan Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter plan title..."
                required
              />
            </div>

            {createMethod === "upload" && (
              <div>
                <Label htmlFor="file">Excel File</Label>
                <Input
                  id="file"
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={(e) => setFile(e.target.files[0])}
                  required
                />
                <p className="text-sm text-gray-500 mt-1">
                  Upload an Excel file with project plan data (.xlsx or .xls)
                </p>
              </div>
            )}

            <div className="flex space-x-2 pt-4">
              <Button type="button" variant="outline" onClick={onClose} className="flex-1">
                Cancel
              </Button>
              <Button type="submit" disabled={isUploading} className="flex-1">
                {isUploading ? "Processing..." : "Create Plan"}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const PlanViewer = ({ plan, isOpen, onClose, onEdit }) => {
  const sections = [
    { key: 'title_sheet', name: 'Title Sheet', icon: '📋' },
    { key: 'revision_history', name: 'Revision History', icon: '📝' },
    { key: 'definitions_references', name: 'Definitions & References', icon: '📚' },
    { key: 'project_introduction', name: 'Project Introduction', icon: '🚀' },
    { key: 'resource_plan', name: 'Resource Plan', icon: '👥' },
    { key: 'pmc_objectives', name: 'PMC & Objectives', icon: '🎯' },
    { key: 'quality_management', name: 'Quality Management', icon: '✅' },
    { key: 'dar_tailoring', name: 'DAR & Tailoring', icon: '⚙️' },
    { key: 'risk_management', name: 'Risk Management', icon: '⚠️' },
    { key: 'opportunity_management', name: 'Opportunity Management', icon: '💡' },
    { key: 'configuration_management', name: 'Configuration Management', icon: '🔧' },
    { key: 'deliverables', name: 'Deliverables', icon: '📦' },
    { key: 'skill_matrix', name: 'Skill Matrix', icon: '🎓' },
    { key: 'supplier_management', name: 'Supplier Management', icon: '🤝' }
  ];

  const renderSectionContent = (sectionData) => {
    if (!sectionData || Object.keys(sectionData).length === 0) {
      return <p className="text-gray-500 italic">No data available for this section</p>;
    }

    if (sectionData.error) {
      return <p className="text-red-500">Error: {sectionData.error}</p>;
    }

    if (sectionData.non_empty_cells) {
      const cells = Object.entries(sectionData.non_empty_cells).slice(0, 10);
      return (
        <div className="space-y-2">
          {cells.map(([position, value]) => (
            <div key={position} className="p-2 bg-gray-50 rounded text-sm">
              <span className="font-mono text-xs text-gray-500">Position {position}: </span>
              <span>{String(value)}</span>
            </div>
          ))}
          {Object.keys(sectionData.non_empty_cells).length > 10 && (
            <p className="text-sm text-gray-500">
              ... and {Object.keys(sectionData.non_empty_cells).length - 10} more items
            </p>
          )}
        </div>
      );
    }

    return <pre className="text-sm bg-gray-50 p-3 rounded overflow-auto">{JSON.stringify(sectionData, null, 2)}</pre>;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            {plan?.title || 'Project Plan'}
            <div className="flex items-center space-x-2">
              <Badge variant="secondary">{plan?.plan_id}</Badge>
              <Button size="sm" onClick={() => onEdit(plan)}>
                <Edit className="h-4 w-4 mr-1" />
                Edit
              </Button>
            </div>
          </DialogTitle>
          <DialogDescription>
            Created: {plan?.created_at ? new Date(plan.created_at).toLocaleDateString() : 'Unknown'}
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-1 overflow-hidden">
          <Tabs defaultValue={sections[0].key} className="h-full flex flex-col">
            <TabsList className="grid grid-cols-7 gap-1 h-auto p-1">
              {sections.slice(0, 7).map((section) => (
                <TabsTrigger key={section.key} value={section.key} className="text-xs p-2">
                  <span className="mr-1">{section.icon}</span>
                  {section.name}
                </TabsTrigger>
              ))}
            </TabsList>
            <TabsList className="grid grid-cols-7 gap-1 h-auto p-1 mt-1">
              {sections.slice(7).map((section) => (
                <TabsTrigger key={section.key} value={section.key} className="text-xs p-2">
                  <span className="mr-1">{section.icon}</span>
                  {section.name}
                </TabsTrigger>
              ))}
            </TabsList>
            
            <div className="flex-1 overflow-auto mt-4">
              {sections.map((section) => (
                <TabsContent key={section.key} value={section.key} className="h-full">
                  <Card className="h-full">
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <span className="mr-2">{section.icon}</span>
                        {section.name}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {renderSectionContent(plan?.[section.key])}
                    </CardContent>
                  </Card>
                </TabsContent>
              ))}
            </div>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const Home = () => {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [showViewer, setShowViewer] = useState(false);
  const { toast } = useToast();

  const loadPlans = async () => {
    try {
      const response = await axios.get(`${API}/plans`);
      setPlans(response.data);
    } catch (error) {
      console.error("Error loading plans:", error);
      toast({
        title: "Error",
        description: "Failed to load project plans",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPlans();
  }, []);

  const handleCreatePlan = async (title, file = null) => {
    setIsUploading(true);
    try {
      if (file) {
        // Upload file
        const formData = new FormData();
        formData.append('file', file);
        formData.append('title', title);
        
        const response = await axios.post(`${API}/plans/upload`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
        
        toast({
          title: "Success",
          description: `Plan uploaded successfully! Plan ID: ${response.data.plan_id}`
        });
      } else {
        // Manual creation
        const response = await axios.post(`${API}/plans`, { title });
        toast({
          title: "Success",
          description: `Plan created successfully! Plan ID: ${response.data.plan_id}`
        });
      }
      
      setShowCreateDialog(false);
      loadPlans();
    } catch (error) {
      console.error("Error creating plan:", error);
      toast({
        title: "Error",
        description: error.response?.data?.detail || "Failed to create plan",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeletePlan = async (plan) => {
    if (window.confirm(`Are you sure you want to delete "${plan.title}"?`)) {
      try {
        await axios.delete(`${API}/plans/${plan.plan_id}`);
        toast({
          title: "Success",
          description: "Plan deleted successfully"
        });
        loadPlans();
      } catch (error) {
        console.error("Error deleting plan:", error);
        toast({
          title: "Error",
          description: "Failed to delete plan",
          variant: "destructive"
        });
      }
    }
  };

  const handleViewPlan = (plan) => {
    setSelectedPlan(plan);
    setShowViewer(true);
  };

  const handleEditPlan = (plan) => {
    // For now, just show the viewer in edit mode
    // In a full implementation, this would open an edit form
    setSelectedPlan(plan);
    setShowViewer(true);
  };

  const filteredPlans = plans.filter(plan =>
    plan.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    plan.plan_id?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Project Plan Manager
          </h1>
          <p className="text-lg text-gray-600 mb-6">
            Create, manage, and organize your project plans with ease
          </p>
        </div>

        {/* Actions Bar */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search plans by title or ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button onClick={() => setShowCreateDialog(true)} className="shrink-0">
            <Plus className="h-4 w-4 mr-2" />
            Create New Plan
          </Button>
        </div>

        {/* Plans Grid */}
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="text-gray-500">Loading plans...</div>
          </div>
        ) : filteredPlans.length === 0 ? (
          <Card className="p-8 text-center">
            <CardContent>
              <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {plans.length === 0 ? "No plans yet" : "No matching plans"}
              </h3>
              <p className="text-gray-500 mb-4">
                {plans.length === 0 
                  ? "Get started by creating your first project plan"
                  : "Try adjusting your search criteria"
                }
              </p>
              {plans.length === 0 && (
                <Button onClick={() => setShowCreateDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First Plan
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPlans.map((plan) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                onView={handleViewPlan}
                onEdit={handleEditPlan}
                onDelete={handleDeletePlan}
              />
            ))}
          </div>
        )}

        {/* Guidelines Section */}
        <div className="mt-12">
          <Separator className="mb-6" />
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <FileText className="h-5 w-5 mr-2" />
                Guidelines
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold mb-2">Creating Plans</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Upload Excel files (.xlsx, .xls) for quick setup</li>
                    <li>• Create manual plans using web forms</li>
                    <li>• Each plan gets a unique 8-character ID</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Plan Sections</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Title Sheet & Revision History</li>
                    <li>• Project Introduction & Resource Planning</li>
                    <li>• Quality, Risk & Opportunity Management</li>
                    <li>• Configuration Management & Deliverables</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Dialogs */}
      <CreatePlanDialog
        isOpen={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        onCreate={handleCreatePlan}
        isUploading={isUploading}
      />

      <PlanViewer
        plan={selectedPlan}
        isOpen={showViewer}
        onClose={() => {
          setShowViewer(false);
          setSelectedPlan(null);
        }}
        onEdit={handleEditPlan}
      />

      <Toaster />
    </div>
  );
};

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;