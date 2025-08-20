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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./components/ui/table";
import { Upload, FileText, Plus, Edit, Eye, Trash2, Download, Search, Save, X, Image, Link } from "lucide-react";
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
  const [createMethod, setCreateMethod] = useState("manual");

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

const ContentRenderer = ({ content, isEditing = false, onContentChange = null }) => {
  if (!content || content.length === 0) {
    return <p className="text-gray-500 italic">No content available</p>;
  }

  const renderContentItem = (item, index) => {
    switch (item.type) {
      case 'table':
        return (
          <div key={index} className="my-4">
            <div className="text-sm text-gray-500 mb-2">Table {item.table_index + 1}</div>
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    {item.headers?.map((header, i) => (
                      <TableHead key={i} className="bg-gray-50">{header}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {item.rows?.map((row, i) => (
                    <TableRow key={i}>
                      {item.headers?.map((header, j) => (
                        <TableCell key={j}>
                          {isEditing ? (
                            <Input
                              value={row[header] || ''}
                              onChange={(e) => {
                                if (onContentChange) {
                                  const newContent = [...content];
                                  newContent[index].rows[i][header] = e.target.value;
                                  onContentChange(newContent);
                                }
                              }}
                              className="w-full"
                            />
                          ) : (
                            row[header] || ''
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        );

      case 'section':
        return (
          <div key={index} className="my-4 space-y-2">
            {item.content?.map((sectionItem, sIndex) => (
              <div key={sIndex} className="p-3 bg-gray-50 rounded-lg">
                {sectionItem.type === 'paragraph' ? (
                  isEditing ? (
                    <Textarea
                      value={sectionItem.content}
                      onChange={(e) => {
                        if (onContentChange) {
                          const newContent = [...content];
                          newContent[index].content[sIndex].content = e.target.value;
                          onContentChange(newContent);
                        }
                      }}
                      className="w-full min-h-[60px]"
                    />
                  ) : (
                    <p className="text-sm">{sectionItem.content}</p>
                  )
                ) : (
                  <div className="grid grid-cols-1 gap-1">
                    {sectionItem.content?.map((cell, cIndex) => (
                      cell && (
                        <div key={cIndex} className="text-sm">
                          <span className="font-mono text-xs text-gray-500 mr-2">
                            Row {sectionItem.position + 1}, Col {cIndex + 1}:
                          </span>
                          {isEditing ? (
                            <Input
                              value={cell}
                              onChange={(e) => {
                                if (onContentChange) {
                                  const newContent = [...content];
                                  newContent[index].content[sIndex].content[cIndex] = e.target.value;
                                  onContentChange(newContent);
                                }
                              }}
                              className="inline-flex w-auto min-w-[200px] ml-2"
                            />
                          ) : (
                            <span>{cell}</span>
                          )}
                        </div>
                      )
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        );

      case 'navigation':
        return (
          <div key={index} className="my-2 p-2 bg-blue-50 rounded-lg border-l-4 border-blue-500">
            <div className="flex items-center">
              <Link className="h-4 w-4 mr-2 text-blue-600" />
              <span className="text-sm text-blue-800 font-medium">{item.content}</span>
            </div>
          </div>
        );

      default:
        return (
          <div key={index} className="my-2 p-2 bg-gray-50 rounded">
            <pre className="text-sm whitespace-pre-wrap">{JSON.stringify(item, null, 2)}</pre>
          </div>
        );
    }
  };

  return (
    <div className="space-y-4">
      {content.map((item, index) => renderContentItem(item, index))}
    </div>
  );
};

const TableRenderer = ({ tables }) => {
  if (!tables || tables.length === 0) {
    return null;
  }

  return (
    <div className="space-y-6">
      {tables.map((table, index) => (
        <div key={index} className="border rounded-lg overflow-hidden">
          <div className="bg-gray-50 px-4 py-2 border-b">
            <h4 className="font-semibold text-sm">Table {index + 1}</h4>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                {table.headers?.map((header, i) => (
                  <TableHead key={i}>{header}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {table.rows?.map((row, i) => (
                <TableRow key={i}>
                  {table.headers?.map((header, j) => (
                    <TableCell key={j}>{row[header] || ''}</TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ))}
    </div>
  );
};

const ImageRenderer = ({ images }) => {
  if (!images || images.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <h4 className="font-semibold text-sm flex items-center">
        <Image className="h-4 w-4 mr-2" />
        Images ({images.length})
      </h4>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {images.map((image, index) => (
          <div key={index} className="border rounded-lg p-4">
            <div className="text-xs text-gray-500 mb-2">
              Format: {image.format} | Position: {image.anchor}
            </div>
            <img
              src={`data:image/${image.format};base64,${image.data}`}
              alt={`Excel Image ${index + 1}`}
              className="max-w-full h-auto rounded"
              style={{ maxHeight: '200px' }}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

const PlanEditor = ({ plan, isOpen, onClose, onSave }) => {
  const [editedPlan, setEditedPlan] = useState(null);
  const [activeSection, setActiveSection] = useState('title_sheet');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (plan) {
      setEditedPlan({ ...plan });
    }
  }, [plan]);

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

  const handleSave = async () => {
    if (!editedPlan) return;

    setIsSaving(true);
    try {
      await onSave(editedPlan);
      onClose();
    } catch (error) {
      console.error('Error saving plan:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSectionContentChange = (sectionKey, newContent) => {
    setEditedPlan(prev => ({
      ...prev,
      [sectionKey]: {
        ...prev[sectionKey],
        content: newContent
      }
    }));
  };

  if (!editedPlan) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[95vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div>
              Edit: {editedPlan.title}
              <Badge variant="secondary" className="ml-2">{editedPlan.plan_id}</Badge>
            </div>
            <div className="flex items-center space-x-2">
              <Button size="sm" variant="outline" onClick={onClose}>
                <X className="h-4 w-4 mr-1" />
                Cancel
              </Button>
              <Button size="sm" onClick={handleSave} disabled={isSaving}>
                <Save className="h-4 w-4 mr-1" />
                {isSaving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-hidden flex">
          {/* Section Navigation */}
          <div className="w-64 border-r bg-gray-50 p-4 overflow-y-auto">
            <div className="space-y-2">
              {sections.map((section) => (
                <button
                  key={section.key}
                  onClick={() => setActiveSection(section.key)}
                  className={`w-full text-left p-3 rounded-lg transition-colors ${
                    activeSection === section.key
                      ? 'bg-blue-100 text-blue-900 border-blue-200 border'
                      : 'hover:bg-gray-100'
                  }`}
                >
                  <div className="flex items-center">
                    <span className="mr-2">{section.icon}</span>
                    <span className="text-sm font-medium">{section.name}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Content Area */}
          <div className="flex-1 p-6 overflow-y-auto">
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-2">
                {sections.find(s => s.key === activeSection)?.icon} {sections.find(s => s.key === activeSection)?.name}
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                Edit the content for this section. Changes will be saved when you click "Save Changes".
              </p>
            </div>

            {/* Title Field */}
            {activeSection === 'title_sheet' && (
              <div className="mb-6">
                <Label htmlFor="planTitle">Plan Title</Label>
                <Input
                  id="planTitle"
                  value={editedPlan.title}
                  onChange={(e) => setEditedPlan(prev => ({ ...prev, title: e.target.value }))}
                  className="mt-2"
                />
              </div>
            )}

            {/* Section Content */}
            <div className="space-y-6">
              {editedPlan[activeSection]?.content && (
                <ContentRenderer
                  content={editedPlan[activeSection].content}
                  isEditing={true}
                  onContentChange={(newContent) => handleSectionContentChange(activeSection, newContent)}
                />
              )}

              {editedPlan[activeSection]?.tables && editedPlan[activeSection].tables.length > 0 && (
                <TableRenderer tables={editedPlan[activeSection].tables} />
              )}

              {editedPlan[activeSection]?.images && editedPlan[activeSection].images.length > 0 && (
                <ImageRenderer images={editedPlan[activeSection].images} />
              )}

              {(!editedPlan[activeSection] || (!editedPlan[activeSection].content?.length && !editedPlan[activeSection].tables?.length)) && (
                <div className="text-center py-12">
                  <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No content in this section</h3>
                  <p className="text-gray-500 mb-4">This section is empty. You can add content by uploading an Excel file or contact support for manual editing features.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const PlanViewer = ({ plan, isOpen, onClose, onEdit }) => {
  const [activeSection, setActiveSection] = useState('title_sheet');

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

  // Include dynamic sections from the plan
  const dynamicSections = plan ? Object.keys(plan).filter(key => 
    !sections.some(s => s.key === key) && 
    typeof plan[key] === 'object' && 
    plan[key] !== null &&
    !['id', 'plan_id', 'title', 'created_at', 'updated_at'].includes(key)
  ).map(key => ({
    key,
    name: key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
    icon: '📄'
  })) : [];

  const allSections = [...sections, ...dynamicSections];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[95vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div>
              {plan?.title || 'Project Plan'}
              <Badge variant="secondary" className="ml-2">{plan?.plan_id}</Badge>
            </div>
            <div className="flex items-center space-x-2">
              <Button size="sm" variant="outline" onClick={() => onEdit(plan)}>
                <Edit className="h-4 w-4 mr-1" />
                Edit
              </Button>
              <Button size="sm" variant="outline" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </DialogTitle>
          <DialogDescription>
            Created: {plan?.created_at ? new Date(plan.created_at).toLocaleDateString() : 'Unknown'}
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-1 overflow-hidden flex">
          {/* Section Navigation */}
          <div className="w-64 border-r bg-gray-50 p-4 overflow-y-auto">
            <div className="space-y-2">
              {allSections.map((section) => (
                <button
                  key={section.key}
                  onClick={() => setActiveSection(section.key)}
                  className={`w-full text-left p-3 rounded-lg transition-colors ${
                    activeSection === section.key
                      ? 'bg-blue-100 text-blue-900 border-blue-200 border'
                      : 'hover:bg-gray-100'
                  }`}
                >
                  <div className="flex items-center">
                    <span className="mr-2">{section.icon}</span>
                    <span className="text-sm font-medium">{section.name}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Content Area */}
          <div className="flex-1 p-6 overflow-y-auto">
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-2">
                {allSections.find(s => s.key === activeSection)?.icon} {allSections.find(s => s.key === activeSection)?.name}
              </h3>
              
              {/* Metadata */}
              {plan?.[activeSection]?.metadata && (
                <div className="text-sm text-gray-600 mb-4">
                  {plan[activeSection].metadata.sheet_name && (
                    <span>Sheet: {plan[activeSection].metadata.sheet_name} • </span>
                  )}
                  {plan[activeSection].metadata.total_rows && (
                    <span>Rows: {plan[activeSection].metadata.total_rows} • </span>
                  )}
                  {plan[activeSection].metadata.processed_items && (
                    <span>Items: {plan[activeSection].metadata.processed_items}</span>
                  )}
                </div>
              )}
            </div>

            {/* Content */}
            <div className="space-y-6">
              {plan?.[activeSection]?.content && (
                <ContentRenderer content={plan[activeSection].content} />
              )}

              {plan?.[activeSection]?.tables && plan[activeSection].tables.length > 0 && (
                <TableRenderer tables={plan[activeSection].tables} />
              )}

              {plan?.[activeSection]?.images && plan[activeSection].images.length > 0 && (
                <ImageRenderer images={plan[activeSection].images} />
              )}

              {plan?.[activeSection]?.metadata?.error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <h4 className="text-red-800 font-semibold mb-2">Error Processing Section</h4>
                  <p className="text-red-700 text-sm">{plan[activeSection].metadata.error}</p>
                </div>
              )}

              {(!plan?.[activeSection] || (!plan[activeSection].content?.length && !plan[activeSection].tables?.length)) && !plan?.[activeSection]?.metadata?.error && (
                <div className="text-center py-12">
                  <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No content available</h3>
                  <p className="text-gray-500">This section is empty or was not processed.</p>
                </div>
              )}
            </div>
          </div>
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
  const [showEditor, setShowEditor] = useState(false);
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

  const handleSavePlan = async (editedPlan) => {
    try {
      const { id, plan_id, created_at, ...updateData } = editedPlan;
      
      const response = await axios.put(`${API}/plans/${plan_id}`, updateData);
      
      toast({
        title: "Success",
        description: "Plan updated successfully"
      });
      
      loadPlans();
      setSelectedPlan(response.data);
    } catch (error) {
      console.error("Error saving plan:", error);
      toast({
        title: "Error",
        description: error.response?.data?.detail || "Failed to save plan",
        variant: "destructive"
      });
      throw error;
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
    setShowEditor(false);
  };

  const handleEditPlan = (plan) => {
    setSelectedPlan(plan);
    setShowEditor(true);
    setShowViewer(false);
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
                Guidelines & Features
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <h4 className="font-semibold mb-2">Creating Plans</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Upload Excel files (.xlsx, .xls) for quick setup</li>
                    <li>• Create manual plans using web forms</li>
                    <li>• Each plan gets a unique 8-character ID</li>
                    <li>• Full editing support for all plan types</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Enhanced Features</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Complete tabular data preservation</li>
                    <li>• Image extraction and display</li>
                    <li>• Structured content organization</li>
                    <li>• Navigation link recognition</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Plan Sections</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• All 14 standard project sections</li>
                    <li>• Dynamic sections for custom sheets</li>
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

      <PlanEditor
        plan={selectedPlan}
        isOpen={showEditor}
        onClose={() => {
          setShowEditor(false);
          setSelectedPlan(null);
        }}
        onSave={handleSavePlan}
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