import React, { useState, useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle, ChevronDown, Clock, Filter, Calendar as CalendarIcon, Lock, Unlock } from "lucide-react";
import { format } from 'date-fns';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuItem
} from "@/components/ui/dropdown-menu";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";

// Importing API functions from your entities.js
import { 
  updateSecurityTask, 
  getFeedbackByTask, 
  submitFeedback,
  getAIRecordByTaskId // IMPORTANT: Ensure this function and its backend endpoint are implemented
} from '@/api/entities'; // Assuming path is correct

const severityColors = {
  critical: "bg-red-100 text-red-800 border-red-200",
  high: "bg-orange-100 text-orange-800 border-orange-200",
  medium: "bg-yellow-100 text-yellow-800 border-yellow-200",
  low: "bg-green-100 text-green-800 border-green-200"
};

const statusIcons = {
  pending: <Clock className="w-4 h-4" />,
  in_progress: <AlertCircle className="w-4 h-4" />,
  completed: <CheckCircle className="w-4 h-4" />
};

export default function SecurityTaskList({ tasks }) {
  const [selectedSeverity, setSelectedSeverity] = useState([]);
  const [selectedSource, setSelectedSource] = useState([]);
  const [selectedStatus, setSelectedStatus] = useState([]);
  const [expandedTask, setExpandedTask] = useState(null);
  const [localTasks, setLocalTasks] = useState(tasks);
  const [aiData, setAiData] = useState({}); // Stores AI table data (mitigation_steps v0, references)
  const [feedbacks, setFeedbacks] = useState({}); // Stores feedback entries for tasks
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const [selectedVersions, setSelectedVersions] = useState({}); // Tracks selected version for each task's details
  const [mitigationVersions, setMitigationVersions] = useState({}); // Stores available versions for mitigation steps dropdown
  const [lockedVersions, setLockedVersions] = useState({});
  
  useEffect(() => {
    setLocalTasks(tasks);
  }, [tasks]);

  useEffect(() => {
    if (expandedTask && (!feedbacks[expandedTask] || !aiData[expandedTask])) { // Load if not already loaded
      loadTaskDetails(expandedTask);
    }
  }, [expandedTask]);

  const loadTaskDetails = async (taskId) => {
    setIsLoading(true);
    setError(null);
    try {
      let fetchedFeedbacks = [];
      let fetchedAiId = null;
      let fetchedAiRecord = null;

      // 1. Fetch feedbacks and AI ID (if an AI record exists for the task)
      try {
        // getFeedbackByTask returns { ai_id, feedbacks }
        // It might throw an error (e.g., 404) if no AI record is found for the task by the backend.
        const feedbackResult = await getFeedbackByTask(taskId);
        if (feedbackResult) {
          fetchedFeedbacks = feedbackResult.feedbacks || [];
          fetchedAiId = feedbackResult.ai_id;
        }
      } catch (fbError) {
        console.warn(`Error fetching feedback data for task ${taskId} (AI record might not exist yet):`, fbError);
        // Continue, as AI record might exist independently or task has no feedbacks yet.
      }
      
      setFeedbacks(prev => ({
        ...prev,
        [taskId]: fetchedFeedbacks.sort((a, b) => b.version_id - a.version_id)
      }));

      // 2. Fetch full AI record (for V0 mitigation steps, references, date_updated)
      // This uses the NEW getAIRecordByTaskId function.
      try {
        fetchedAiRecord = await getAIRecordByTaskId(taskId); // API returns the AI record or null/404
        if (fetchedAiRecord) {
          setAiData(prev => ({ ...prev, [taskId]: fetchedAiRecord }));
        } else {
           // If no AI record, set a default structure with the AI ID if we got one from feedback call
          setAiData(prev => ({ ...prev, [taskId]: { ai_id: fetchedAiId, mitigation_steps: [], references: [], date_updated: null } }));
        }
      } catch (aiFetchError) {
        console.error(`Error fetching AI record for task ${taskId}:`, aiFetchError);
        setAiData(prev => ({ ...prev, [taskId]: { ai_id: fetchedAiId, mitigation_steps: [], references: [], date_updated: null } }));
      }
      
      // 3. Setup mitigation versions dropdown
      const uniqueFeedbackVersions = [...new Set(fetchedFeedbacks.map(f => f.version_id))].sort((a, b) => b - a);
      const versionsList = [];

      if (fetchedAiRecord || fetchedAiId) { // Only add Version 0 if an AI context exists
        versionsList.push({ 
          version: 0, 
          label: `Version 0 (AI)${fetchedAiRecord ? '' : ' - Data N/A'}`, 
          date: fetchedAiRecord?.date_updated 
        });
      }
      
      uniqueFeedbackVersions.forEach(version => {
        versionsList.push({
          version,
          label: `Version ${version}`,
          date: fetchedFeedbacks.find(f => f.version_id === version)?.created_at || new Date().toISOString()
        });
      });

      if (versionsList.length === 0) { // Fallback if no AI record and no feedbacks
        versionsList.push({ version: 0, label: "Version 0 - No data", date: null });
      }

      setMitigationVersions(prev => ({ ...prev, [taskId]: versionsList }));
      
      // Set the latest version as default, or version 0 if no other versions exist
      const latestVersion = uniqueFeedbackVersions.length > 0 ? Math.max(...uniqueFeedbackVersions) : 0;
      setSelectedVersions(prev => ({ ...prev, [taskId]: latestVersion }));

    } catch (err) {
      console.error("Error loading task details:", err);
      setError("Failed to load task details. Please try again.");
      // Set defaults to avoid UI errors
      setFeedbacks(prev => ({ ...prev, [taskId]: [] }));
      setAiData(prev => ({ ...prev, [taskId]: { mitigation_steps: [], references: [], date_updated: null } }));
      setMitigationVersions(prev => ({ ...prev, [taskId]: [{ version: 0, label: "Version 0 - No data", date: null }] }));
      setSelectedVersions(prev => ({ ...prev, [taskId]: 0 }));
    } finally {
      setIsLoading(false);
    }
  };

  const handleTaskExpand = (taskId) => {
    if (expandedTask === taskId) {
      setExpandedTask(null);
    } else {
      setExpandedTask(taskId);
      // Data loading is handled by useEffect watching expandedTask
    }
  };

  const humanOptions = [
    { value: "Trigunanand", label: "Trigunanand" },
    { value: "Piyush", label: "Piyush" },
    { value: "Kushagra", label: "Kushagra" }
  ];

  useEffect(() => {
    if (tasks && tasks.length > 0) {
      console.log("Task structure (first task):", tasks[0]);
    }
  }, [tasks]);

  const handleStatusChange = async (taskId, newStatus) => {
    // Propagation is handled by onClick on SelectTrigger/SelectContent
    try {
      setIsLoading(true);
      const taskToUpdate = localTasks.find(t => t.security_task_id === taskId);
      if (!taskToUpdate) throw new Error("Task not found for status update");
      
      const updateId = taskToUpdate.id || taskToUpdate.security_task_id; // Use task.id if available, else security_task_id
      
      const updatedTask = await updateSecurityTask(updateId, { status: newStatus });
      
      setLocalTasks(prevTasks => 
        prevTasks.map(task => 
          task.security_task_id === taskId 
            ? { ...task, status: updatedTask.status } // Use status from response
            : task
        )
      );
    } catch (error) {
      console.error("Error updating status:", error);
      setError(`Failed to update status: ${error.message || 'Unknown error'}. Please try again.`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAssignToHuman = async (taskId, assignedPerson) => {
    try {
      setIsLoading(true);
      const taskToUpdate = localTasks.find(t => t.security_task_id === taskId);
      if (!taskToUpdate) throw new Error("Task not found for assignment");
      
      const updateId = taskToUpdate.id || taskToUpdate.security_task_id;
      
      const updatedTask = await updateSecurityTask(updateId, {
        assigned_to: assignedPerson,
        authority_level: "executing_by_human"
      });
      
      setLocalTasks(prevTasks => 
        prevTasks.map(task => 
          task.security_task_id === taskId 
            ? { ...task, assigned_to: updatedTask.assigned_to, authority_level: updatedTask.authority_level } 
            : task
        )
      );
    } catch (error) {
      console.error("Error updating assignment:", error);
      setError(`Failed to assign task: ${error.message || 'Unknown error'}. Please try again.`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateDueDate = async (taskId, newDate, event) => {
    if (event) event.stopPropagation(); // Calendar's onSelect passes the event
    
    try {
      setIsLoading(true);
      const taskToUpdate = localTasks.find(t => t.security_task_id === taskId);
      if (!taskToUpdate) throw new Error("Task not found for due date update");
      
      const updateId = taskToUpdate.id || taskToUpdate.security_task_id;
      
      const updatedTask = await updateSecurityTask(updateId, {
        due_date: newDate ? format(newDate, 'yyyy-MM-dd') : null // Ensure correct date format for backend
      });
      
      setLocalTasks(prevTasks => 
        prevTasks.map(task => 
          task.security_task_id === taskId 
            ? { ...task, due_date: updatedTask.due_date } 
            : task
        )
      );
    } catch (error) {
      console.error("Error updating due date:", error);
      setError(`Failed to update due date: ${error.message || 'Unknown error'}. Please try again.`);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredTasks = localTasks.filter(task => {
    const severityMatch = selectedSeverity.length === 0 || selectedSeverity.includes(task.severity);
    const sourceMatch = selectedSource.length === 0 || selectedSource.includes(task.source);
    const statusMatch = selectedStatus.length === 0 || selectedStatus.includes(task.status);
    return severityMatch && sourceMatch && statusMatch;
  });

  const handleFeedbackSubmit = async (taskId, feedbackText, mitigationStep = "") => {
    if (!feedbackText.trim()) return;
    
    try {
      setIsLoading(true);
      // The submitFeedback API handles ai_id creation/retrieval and versioning internally.
      // It expects `taskId` to be the `security_task_id`.
      await submitFeedback({
        taskId: taskId, // This is security_task_id
        feedbackText: feedbackText,
        mitigationStep: mitigationStep ? [mitigationStep] : [], // API expects array
        provider: 'DevOps Engineer'
      });

      // Refresh feedbacks and potentially AI data for the task
      await loadTaskDetails(taskId);
    } catch (error) {
      console.error("Error submitting feedback:", error);
      setError(`Failed to submit feedback: ${error.message || 'Unknown error'}. Please try again.`);
    } finally {
      setIsLoading(false);
    }
  };
  
  const toggleVersionLock = (taskId, version) => {
    setLockedVersions(prev => ({
      ...prev,
      [taskId]: {
        ...(prev[taskId] || {}),
        [version]: !(prev[taskId]?.[version] || false)
      }
    }));
  };

const ResourceDetails = ({ task }) => {
  const [feedbackInput, setFeedbackInput] = useState(''); // Renamed from feedback to avoid conflict
  const [selectedMitigationStep, setSelectedMitigationStep] = useState('');
  
  // Use data from state, provide defaults
  const taskSpecificFeedbacks = feedbacks[task.security_task_id] || [];
  const taskSpecificAiData = aiData[task.security_task_id] || { mitigation_steps: [], references: [] };
  
  const taskMitigationVersions = mitigationVersions[task.security_task_id] || [{ version: 0, label: "Version 0 - No data", date: null }];
  const selectedVersion = selectedVersions[task.security_task_id] !== undefined ? selectedVersions[task.security_task_id] : 0;
  const isVersionLocked = lockedVersions[task.security_task_id]?.[selectedVersion] || false;

  const getMitigationSteps = () => {
    if (selectedVersion === 0) {
      return taskSpecificAiData?.mitigation_steps || [];
    }
    const currentVersionFeedback = taskSpecificFeedbacks
      .find(fb => fb.version_id === selectedVersion && fb.mitigation_step && fb.mitigation_step.length > 0);
    return currentVersionFeedback ? currentVersionFeedback.mitigation_step : [];
  };

  const getFeedbacksUpToVersion = () => {
    if (selectedVersion === 0) return [];
    return taskSpecificFeedbacks
      .filter(fb => fb.version_id <= selectedVersion)
      .sort((a, b) => b.version_id - a.version_id); // Already sorted in state, but good to be sure
  };

  const getTotalFeedbackVersions = () => {
    return new Set(taskSpecificFeedbacks.map(f => f.version_id)).size;
  };

  const currentMitigationSteps = getMitigationSteps();

  return (
    <div className="pl-4 md:pl-8 py-4 bg-gray-50 border-t border-b">
      <div className="mb-6 border-b pb-4">
        <h3 className="font-semibold mb-3">Resource Details:</h3>
        <div className="space-y-2 ml-2">
          <div><span className="font-semibold">Resource ID:</span> {task.resource_id || 'N/A'}</div>
          <div><span className="font-semibold">Region:</span> {task.region || 'N/A'}</div>
          <div><span className="font-semibold">Impact:</span> {task.impact_description || 'N/A'}</div>
          {task.compliance && (<div><span className="font-semibold">Compliance:</span> {task.compliance}</div>)}
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-4">
        <div className="w-full lg:w-3/5">
          <div className="border rounded-lg bg-white p-4 h-full flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-semibold">Risk Mitigation Steps</h4>
              <div className="flex items-center gap-1">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="flex items-center gap-1 px-2 py-1 text-xs text-sky-600 hover:bg-gray-100 rounded">
                      {taskMitigationVersions.find(v => v.version === selectedVersion)?.label || `Version ${selectedVersion}`}
                      <ChevronDown className="w-3 h-3" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {taskMitigationVersions.map(ver => (
                      <DropdownMenuItem 
                        key={ver.version}
                        onClick={() => setSelectedVersions(prev => ({ ...prev, [task.security_task_id]: ver.version }))}
                        className={selectedVersion === ver.version ? "bg-gray-100" : ""}
                      >
                        <span>{ver.label}</span>
                        {ver.date && <span className="ml-2 text-xs text-gray-500">{format(new Date(ver.date), 'PPpp')}</span>}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
                
                {selectedVersion !== 0 && (
                  <button
                    onClick={() => toggleVersionLock(task.security_task_id, selectedVersion)}
                    className={`p-1 rounded hover:bg-gray-200 ${isVersionLocked ? 'text-red-500' : 'text-gray-500'}`}
                    title={isVersionLocked ? "Unlock version" : "Lock version"}
                  >
                    {isVersionLocked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                  </button>
                )}
              </div>
            </div>
            
            <div className="flex-grow h-[300px] overflow-y-auto pr-2 custom-scrollbar">
              <div className="border rounded-lg p-4 bg-gray-50">
                <ol className="list-decimal pl-4 space-y-4">
                  {currentMitigationSteps.map((step, index) => (
                    <li key={index} className="pl-2"><div className="font-medium text-sm">{step}</div></li>
                  ))}
                  {currentMitigationSteps.length === 0 && (
                    <p className="text-sm text-gray-500">No mitigation steps available for this version</p>
                  )}
                </ol>
              </div>
            </div>
          </div>
        </div>

        <div className="w-full lg:w-2/5">
          <div className="border rounded-lg bg-white p-4 h-full">
            <h4 className="font-semibold mb-2">Considerations</h4>
            <div className="h-[400px] overflow-y-auto pr-2 custom-scrollbar">
              <div className="space-y-4">
                <div>
                  <h5 className="font-medium text-sm mb-3">Feedback</h5>
                  <div className="space-y-6">
                    {getFeedbacksUpToVersion().map((fb) => (
                      <div key={fb.feedback_id} className={fb.version_id === selectedVersion ? 'bg-blue-50 p-2 rounded-md' : ''}>
                        <div className="text-sm">
                          <div className="font-medium mb-1 flex justify-between">
                            <span>{fb.provider === 'user' ? 'DevOps Engineer' : fb.provider}</span>
                            <span className="text-[11px] text-gray-400">
                              Version {fb.version_id} • {fb.created_at ? new Date(fb.created_at).toLocaleString() : 'N/A'}
                            </span>
                          </div>
                          <div className="text-gray-700">{fb.feedback}</div>
                        </div>
                      </div>
                    ))}
                    {getFeedbacksUpToVersion().length === 0 && (
                      <p className="text-sm text-gray-500">
                        {selectedVersion === 0 && getTotalFeedbackVersions() > 0
                          ? `${getTotalFeedbackVersions()} feedback version(s) available for this task. Select a version to view.`
                          : "No feedback available for this version."}
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <h5 className="font-medium text-sm mb-3">References</h5>
                  <div className="space-y-3">
                    {taskSpecificAiData.reference_links?.map((reference, index) => (
                      <div key={index} className="flex gap-3 items-start">
                        {reference.icon_url && <img src={reference.icon_url} className="w-5 h-5 mt-1" alt="" />}
                        <div>
                          <a href={reference.url} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-gray-900 hover:underline block">
                            {reference.title}
                          </a>
                          <div className="text-sm text-gray-600 mt-1">{reference.description}</div>
                        </div>
                      </div>
                    ))}
                    {(!taskSpecificAiData.reference_links || taskSpecificAiData.reference_links.length === 0) && (
                      <p className="text-sm text-gray-500">No references available</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {isVersionLocked && (
        <div className="mt-4 p-3 bg-gray-100 rounded-lg text-sm text-gray-600 flex items-center gap-2">
          <Lock className="w-4 h-4" /> This version is locked. No new feedback can be added.
        </div>
      )}

      {!isVersionLocked && (
        <div className="mt-4">
          <div className="flex flex-col gap-2">
            {selectedMitigationStep && (
              <div className="text-sm">
                <span className="font-medium">Providing feedback for: </span> 
                <span className="text-blue-600">{selectedMitigationStep}</span>
                <button onClick={() => setSelectedMitigationStep('')} className="ml-2 text-xs text-gray-500 hover:underline">Clear</button>
              </div>
            )}
            <div className="flex gap-2">
              <input
                type="text"
                placeholder={selectedMitigationStep ? "Provide feedback for this step..." : "Provide general feedback..."}
                value={feedbackInput}
                onChange={(e) => setFeedbackInput(e.target.value)}
                className="flex-1 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={() => {
                  handleFeedbackSubmit(task.security_task_id, feedbackInput, selectedMitigationStep);
                  setFeedbackInput('');
                  setSelectedMitigationStep('');
                }}
                className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                disabled={isLoading} // Disable button while loading
              >
                {isLoading ? 'Submitting...' : 'Submit Feedback'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

  if (isLoading && !expandedTask) { // Show global loading only if not expanding a task (which has its own indicators)
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 text-red-700 rounded-lg">
        <p>{error}</p>
        <button onClick={() => setError(null)} className="mt-2 px-4 py-2 bg-red-100 rounded-lg hover:bg-red-200">Dismiss</button>
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-white">
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="text-lg font-semibold">SECURITY RECOMMENDATIONS</h2>
        <div className="flex items-center gap-2">
          {/* Filter Dropdown Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 px-3 py-1 text-sm bg-gray-100 rounded-lg">
                <Filter className="w-4 h-4" /> Filter <ChevronDown className="w-3 h-3 ml-1" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56">
              {/* Severity Filters */}
              <div className="p-2 font-semibold text-sm">Severity</div>
              {['critical', 'high', 'medium', 'low'].map(sev => (
                <DropdownMenuCheckboxItem
                  key={sev}
                  checked={selectedSeverity.includes(sev)}
                  onCheckedChange={(checked) =>
                    setSelectedSeverity(prev => checked ? [...prev, sev] : prev.filter(s => s !== sev))
                  }
                >{sev.charAt(0).toUpperCase() + sev.slice(1)}</DropdownMenuCheckboxItem>
              ))}
              <DropdownMenuSeparator />
              {/* Source Filters */}
              <div className="p-2 font-semibold text-sm">Source</div>
              {['GuardDuty', 'ScoutSuite', 'CloudChecker'].map(src => (
                 <DropdownMenuCheckboxItem
                  key={src}
                  checked={selectedSource.includes(src)}
                  onCheckedChange={(checked) =>
                    setSelectedSource(prev => checked ? [...prev, src] : prev.filter(s => s !== src))
                  }
                >{src === 'GuardDuty' ? 'Guard Duty' : src === 'ScoutSuite' ? 'Scout Suite' : 'Cloud Checker'}</DropdownMenuCheckboxItem>
              ))}
              <DropdownMenuSeparator />
              {/* Status Filters */}
              <div className="p-2 font-semibold text-sm">Status</div>
              {[{value: 'pending', label: 'Pending'}, {value: 'in_progress', label: 'In Progress'}, {value: 'completed', label: 'Ready for Implementation'}].map(stat => (
                <DropdownMenuCheckboxItem
                  key={stat.value}
                  checked={selectedStatus.includes(stat.value)}
                  onCheckedChange={(checked) =>
                    setSelectedStatus(prev => checked ? [...prev, stat.value] : prev.filter(s => s !== stat.value))
                  }
                >{stat.label}</DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Security Risks</TableHead>
              <TableHead>Severity</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Human in Loop</TableHead>
              <TableHead>AI Agent</TableHead>
              <TableHead>Recc. date</TableHead>
              <TableHead>Due Date</TableHead>
              <TableHead>Authority Level</TableHead>
              <TableHead>Risk Classification</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredTasks.map((task) => (
              <React.Fragment key={task.security_task_id}>
                <TableRow 
                  className="hover:bg-gray-50 cursor-pointer"
                  onClick={() => handleTaskExpand(task.security_task_id)}
                >
                  <TableCell className="font-medium flex items-center gap-2">
                    <ChevronDown 
                      className={`w-4 h-4 transition-transform ${expandedTask === task.security_task_id ? 'transform rotate-180' : ''}`}
                    />
                    {task.name}
                  </TableCell>
                  <TableCell><Badge className={severityColors[task.severity]}>{task.severity}</Badge></TableCell>
                  <TableCell>{task.source === 'GuardDuty' ? 'Guard Duty' : task.source === 'CloudChecker' ? 'Cloud checker' : 'Scout suite'}</TableCell>
                  <TableCell>
                    <Select
                      value={task.status}
                      onValueChange={(value) => handleStatusChange(task.security_task_id, value)}
                      // Propagation stopped by onClick on Trigger and Content
                    >
                      <SelectTrigger className="w-[160px] h-8 text-xs" onClick={(e) => e.stopPropagation()}>
                        <SelectValue>
                          <div className={task.status === 'completed' ? 'text-green-600' : task.status === 'in_progress' ? 'text-orange-500' : 'text-yellow-500'}>
                            <div className="flex items-center gap-2">
                              {statusIcons[task.status]}
                              {task.status === 'completed' ? 'Ready for Implementation' : task.status === 'in_progress' ? 'In Progress' : 'Pending'}
                            </div>
                          </div>
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent onClick={(e) => e.stopPropagation()}>
                        <SelectItem value="pending"><div className="flex items-center gap-2 text-yellow-500"><Clock className="w-4 h-4" />Pending</div></SelectItem>
                        <SelectItem value="in_progress"><div className="flex items-center gap-2 text-orange-500"><AlertCircle className="w-4 h-4" />In Progress</div></SelectItem>
                        <SelectItem value="completed"><div className="flex items-center gap-2 text-green-600"><CheckCircle className="w-4 h-4" />Ready for Implementation</div></SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Select
                      value={task.assigned_to || ""}
                      onValueChange={(value) => handleAssignToHuman(task.security_task_id, value)}
                    >
                      <SelectTrigger className="w-[120px] h-8 text-xs" onClick={(e) => e.stopPropagation()}>
                        <SelectValue placeholder="Assign to">
                          {task.assigned_to ? (<div className="flex items-center space-x-1"><span className="text-sm">👤</span><span className="text-xs">{task.assigned_to}</span></div>) : "Assign to"}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent onClick={(e) => e.stopPropagation()}>
                        {humanOptions.map(option => (<SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>{task.authority_level === 'executing_by_ai' && (<div className="bg-slate-50 w-8 h-8 rounded-full" />)}</TableCell>
                  <TableCell>{task.created_date && format(new Date(task.created_date), 'MMM dd, yyyy')}</TableCell>
                  <TableCell>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-[130px] h-8 text-xs justify-start py-1 px-2" onClick={(e) => e.stopPropagation()}>
                          <CalendarIcon className="mr-2 h-3 w-3" />
                          {task.due_date ? format(new Date(task.due_date), 'MMM dd, yyyy') : <span>Set due date</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start" onClick={(e) => e.stopPropagation()}>
                        <Calendar
                          mode="single"
                          selected={task.due_date ? new Date(task.due_date) : undefined}
                          onSelect={(date, selectedDate, activeModifiers, e) => handleUpdateDueDate(task.security_task_id, date, e)} // Pass event 'e'
                        />
                      </PopoverContent>
                    </Popover>
                  </TableCell>
                  <TableCell>{task.authority_level === 'executing_by_ai' ? 'Executing By AI' : 'Executing By Human'}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={task.risk_classification === 'high' ? 'text-red-700 border-red-200' : task.risk_classification === 'moderate' ? 'text-orange-700 border-orange-200' : 'text-green-700 border-green-200'}>
                      {task.risk_classification}
                    </Badge>
                  </TableCell>
                </TableRow>
                {expandedTask === task.security_task_id && (
                  <TableRow>
                    <TableCell colSpan={10} className="p-0">
                      {isLoading && <div className="p-4 text-center">Loading details...</div>}
                      {!isLoading && <ResourceDetails task={task} />}
                    </TableCell>
                  </TableRow>
                )}
              </React.Fragment>
            ))}
          </TableBody>
        </Table>
      </div>
      <div className="p-2 text-sm text-gray-600 border-t">
        Showing 1 to {filteredTasks.length} of {localTasks.length} entries
      </div>
    </div>
  );
}