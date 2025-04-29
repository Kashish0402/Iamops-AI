
import React, { useState, useRef, useEffect } from 'react';
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
//import { SecurityTask } from '@/api/entities';
//import { AITable } from '@/api/entities';
//import { Feedback } from '@/api/entities';
//import { InvokeLLM } from "@/api/integrations";

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
  const [aiData, setAiData] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [feedbacks, setFeedbacks] = useState({});
  const [selectedVersions, setSelectedVersions] = useState({});
  const [mitigationVersions, setMitigationVersions] = useState({});
  const [lockedVersions, setLockedVersions] = useState({});
  
  useEffect(() => {
    setLocalTasks(tasks);
  }, [tasks]);

  useEffect(() => {
    if (expandedTask) {
      loadFeedbacks(expandedTask);
    }
  }, [expandedTask]);

  const loadFeedbacks = async (taskId) => {
    try {
      const aiRecord = await AITable.filter({ security_task_id: taskId });
      if (aiRecord && aiRecord.length > 0) {
        const ai_id = aiRecord[0].ai_id;
        const taskFeedbacks = await Feedback.filter({ ai_id: ai_id });
        setFeedbacks(prev => ({
          ...prev,
          [taskId]: taskFeedbacks.sort((a, b) => b.version_id - a.version_id)
        }));
        
        setAiData(prev => ({
          ...prev,
          [taskId]: aiRecord[0]
        }));
        
        const uniqueVersions = [...new Set(taskFeedbacks.map(f => f.version_id))].sort((a, b) => b - a);
        
        setMitigationVersions(prev => ({
          ...prev,
          [taskId]: [
            { version: 0, label: "Version 0 (AI)", date: aiRecord[0].date_updated },
            ...uniqueVersions.map(version => ({
              version,
              label: `Version ${version}`,
              date: taskFeedbacks.find(f => f.version_id === version)?.created_at || new Date().toISOString()
            }))
          ]
        }));
        
        // Set the latest version as default, or version 0 if no other versions exist
        const latestVersion = uniqueVersions.length > 0 ? Math.max(...uniqueVersions) : 0;
        setSelectedVersions(prev => ({
          ...prev,
          [taskId]: latestVersion
        }));
      }
    } catch (error) {
      console.error("Error loading feedbacks:", error);
    }
  };

  // Load AI data only when expanding a task
  const loadAIDataForTask = async (taskId) => {
    if (!aiData[taskId]) {
      try {
        setIsLoading(true);
        const aiRecord = await AITable.filter({ security_task_id: taskId });
        if (aiRecord && aiRecord.length > 0) {
          setAiData(prev => ({
            ...prev,
            [taskId]: aiRecord[0]
          }));
        }
      } catch (error) {
        console.error("Error loading AI data:", error);
        setError("Failed to load AI data. Please try again later.");
      } finally {
        setIsLoading(false);
      }
    }
  };

  // Handle task expansion with data loading
  const handleTaskExpand = async (taskId) => {
    if (expandedTask === taskId) {
      setExpandedTask(null);
    } else {
      setExpandedTask(taskId);
      await loadAIDataForTask(taskId);
    }
  };

  const humanOptions = [
    { value: "Piyush", label: "Piyush" },
    { value: "Trigunanand", label: "Trigunanand" },
    { value: "Kushagra", label: "Kushagra" }
  ];

  // Debug function to log task structure
  useEffect(() => {
    if (tasks.length > 0) {
      console.log("Task structure:", tasks[0]);
    }
  }, [tasks]);

  const handleStatusChange = async (taskId, newStatus, e) => {
    // Stop propagation to prevent row expansion
    e.stopPropagation();
    
    try {
      setIsLoading(true);
      console.log("Updating task with ID:", taskId);
      
      // In Base44 apps, the ID might be in a different format
      // Let's try using the id property directly
      const taskToUpdate = localTasks.find(t => t.security_task_id === taskId);
      if (!taskToUpdate) {
        throw new Error("Task not found");
      }
      
      // Use the task's ID for the update
      const updateId = taskToUpdate.id || taskToUpdate.security_task_id;
      console.log("Using update ID:", updateId);
      
      await SecurityTask.update(updateId, { status: newStatus });
      
      setLocalTasks(prevTasks => 
        prevTasks.map(task => 
          task.security_task_id === taskId 
            ? { ...task, status: newStatus } 
            : task
        )
      );
    } catch (error) {
      console.error("Error updating status:", error);
      console.log("Error details:", JSON.stringify(error));
      setError(`Failed to update status: ${error.message}. Please try again.`);
    } finally {
      setIsLoading(false);
    }
  };

  // Similar updates for other handler functions
  const handleAssignToHuman = async (taskId, assignedPerson, e) => {
    e.stopPropagation();
    
    try {
      setIsLoading(true);
      const taskToUpdate = localTasks.find(t => t.security_task_id === taskId);
      if (!taskToUpdate) {
        throw new Error("Task not found");
      }
      
      const updateId = taskToUpdate.id || taskToUpdate.security_task_id;
      
      await SecurityTask.update(updateId, {
        assigned_to: assignedPerson,
        authority_level: "executing_by_human"
      });
      
      setLocalTasks(prevTasks => 
        prevTasks.map(task => 
          task.security_task_id === taskId 
            ? { ...task, assigned_to: assignedPerson, authority_level: "executing_by_human" } 
            : task
        )
      );
    } catch (error) {
      console.error("Error updating assignment:", error);
      setError(`Failed to assign task: ${error.message}. Please try again.`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateDueDate = async (taskId, newDate, e) => {
    if (e) e.stopPropagation();
    
    try {
      setIsLoading(true);
      const taskToUpdate = localTasks.find(t => t.security_task_id === taskId);
      if (!taskToUpdate) {
        throw new Error("Task not found");
      }
      
      const updateId = taskToUpdate.id || taskToUpdate.security_task_id;
      
      await SecurityTask.update(updateId, {
        due_date: newDate
      });
      
      setLocalTasks(prevTasks => 
        prevTasks.map(task => 
          task.security_task_id === taskId 
            ? { ...task, due_date: newDate } 
            : task
        )
      );
    } catch (error) {
      console.error("Error updating due date:", error);
      setError(`Failed to update due date: ${error.message}. Please try again.`);
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
  const [feedback, setFeedback] = useState('');
  const [selectedMitigationStep, setSelectedMitigationStep] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const taskFeedbacks = feedbacks[task.security_task_id] || [];
  const taskAiData = aiData[task.security_task_id] || {};
  
  const versions = mitigationVersions[task.security_task_id] || [
    { version: 1, label: "v1 (latest)", date: new Date().toISOString() }
  ];
  
  const selectedVersion = selectedVersions[task.security_task_id] || 0;
  const isVersionLocked = lockedVersions[task.security_task_id]?.[selectedVersion] || false;

  // Get mitigation steps based on version
  const getMitigationSteps = () => {
    if (selectedVersion === 0) {
      return taskAiData?.mitigation_steps || [];
    }
    // Get all feedback up to current version that have mitigation steps
    const stepsFromFeedback = taskFeedbacks
      .filter(fb => fb.version_id <= selectedVersion && fb.mitigation_step && fb.mitigation_step.length > 0)
      .sort((a, b) => b.version_id - a.version_id)
      .flatMap(fb => fb.mitigation_step);
    
    return stepsFromFeedback;
  };

  const getFeedbacksUpToVersion = () => {
    const allFeedbacks = feedbacks[task.security_task_id] || [];
    return allFeedbacks
      .filter(fb => fb.version_id <= selectedVersion)
      .sort((a, b) => b.version_id - a.version_id);
  };

  const getTotalVersions = () => {
    const allFeedbacks = feedbacks[task.security_task_id] || [];
    return new Set(allFeedbacks.map(fb => fb.version_id)).size;
  };

  const mitigationSteps = getMitigationSteps();

  const handleFeedbackSubmit = async (taskId, feedbackText) => {
    if (!feedbackText.trim()) return;
    
    try {
      setIsSubmitting(true);
      const aiRecord = await AITable.filter({ security_task_id: taskId });
      if (!aiRecord || aiRecord.length === 0) {
        throw new Error("No AI record found for this task");
      }
      
      const ai_id = aiRecord[0].ai_id;
      
      // Get existing feedbacks to determine next version
      const existingFeedbacks = await Feedback.filter({ ai_id: ai_id });
      const nextVersion = existingFeedbacks.length > 0 
        ? Math.max(...existingFeedbacks.map(f => f.version_id)) + 1 
        : 1;

      // Get current mitigation steps
      const currentSteps = getMitigationSteps();
      const currentStepsText = currentSteps.length > 0 
        ? "Current mitigation steps:\n" + currentSteps.map((step, i) => `${i+1}. ${step}`).join("\n") 
        : "No current mitigation steps.";
        
      // Get new mitigation steps based on the feedback using LLM
      const llmResponse = await InvokeLLM({
        prompt: `You are a security expert tasked with improving mitigation steps based on feedback.

${currentStepsText}

A Team Lead Mihir has provided this feedback: "${feedbackText}"

Based on this feedback and considering the current mitigation steps, provide an updated and comprehensive set of mitigation steps.
Include both the relevant existing steps (potentially improved) and new steps addressing the feedback.
Return 3-5 clear, actionable, and specific mitigation steps that together form a complete solution.`,
        response_json_schema: {
          type: "object",
          properties: {
            mitigation_steps: {
              type: "array",
              items: { type: "string" },
              description: "The complete set of mitigation steps, including both improved existing steps and new steps"
            }
          },
          required: ["mitigation_steps"]
        }
      });

      // Create feedback record with new mitigation steps
      await Feedback.create({
        feedback_id: `${ai_id}_v${nextVersion}`,
        provider: 'Team Lead Mihir',
        feedback: feedbackText,
        mitigation_step: llmResponse?.mitigation_steps || [],
        version_id: nextVersion,
        ai_id: ai_id,
        created_at: new Date().toISOString()
      });

      // Refresh feedbacks
      await loadFeedbacks(taskId);
      
      // Clear the input
      setFeedback('');
      setSelectedMitigationStep('');
      
    } catch (error) {
      console.error("Error submitting feedback:", error);
      setError(`Failed to submit feedback: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Log feedback data for debugging
  useEffect(() => {
    console.log("Task ID:", task.security_task_id);
    console.log("All feedbacks:", taskFeedbacks);
    console.log("Filtered feedbacks:", getFeedbacksUpToVersion());
  }, [task.security_task_id, taskFeedbacks, selectedVersion]);

  return (
    <div className="pl-4 md:pl-8 py-4 bg-gray-50 border-t border-b">
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Risk Mitigation Section - 60% */}
        <div className="w-full lg:w-3/5">
          <div className="border rounded-lg bg-white p-4 h-full flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-semibold">Risk Mitigation Steps</h4>
              <div className="flex items-center gap-1">
                {/* Version Dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="flex items-center gap-1 px-2 py-1 text-xs text-sky-600 hover:bg-gray-100 rounded">
                      Version {selectedVersion}
                      <ChevronDown className="w-3 h-3" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {versions.map(ver => (
                      <DropdownMenuItem 
                        key={ver.version}
                        onClick={() => setSelectedVersions(prev => ({
                          ...prev,
                          [task.security_task_id]: ver.version
                        }))}
                        className={selectedVersion === ver.version ? "bg-gray-100" : ""}
                      >
                        <span>{ver.label}</span>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
                
                {/* Lock Button - Only show for non-AI versions */}
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
            
            <div className="flex-grow h-[240px] overflow-y-auto pr-2 custom-scrollbar">
              <div className="border rounded-lg p-4 bg-gray-50">
                <ol className="list-decimal pl-4 space-y-4">
                  {mitigationSteps.map((step, index) => (
                    <li key={index} className="pl-2">
                      <div className="text-sm text-gray-700">{step}</div>
                    </li>
                  ))}
                  {mitigationSteps.length === 0 && (
                    <p className="text-sm text-gray-500">No mitigation steps available</p>
                  )}
                </ol>
              </div>
            </div>
          
            {/* Feedback input in the mitigation steps card */}
            {!isVersionLocked && (
              <div className="mt-4 pt-3 border-t">
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Provide feedback to improve mitigation steps..."
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    className="flex-1 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={() => handleFeedbackSubmit(task.security_task_id, feedback)}
                    disabled={isSubmitting}
                    className={`px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 whitespace-nowrap ${
                      isSubmitting ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Processing...
                      </>
                    ) : (
                      'Submit Feedback'
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Considerations Section - 40% */}
        <div className="w-full lg:w-2/5">
          <div className="border rounded-lg bg-white p-4 h-full">
            <h4 className="font-semibold mb-2">Considerations</h4>
            <div className="h-[400px] overflow-y-auto pr-2 custom-scrollbar">
              <div className="space-y-4">
                {/* Feedback Section */}
                <div>
                  <h5 className="font-medium text-sm mb-3">Feedback</h5>
                  <div className="space-y-6">
                    {getFeedbacksUpToVersion().map((fb) => (
                      <div key={fb.feedback_id}>
                        <div className="text-sm">
                          <div className="font-medium mb-1">
                            {fb.provider === 'user' ? 'Team Lead Mihir' : fb.provider}
                          </div>
                          <div className="text-gray-700">{fb.feedback}</div>
                          <div className="text-[11px] text-gray-400 mt-1">
                            ver{fb.version_id} • {new Date(fb.created_at).toLocaleString()}
                          </div>
                        </div>
                      </div>
                    ))}
                    {getFeedbacksUpToVersion().length === 0 && (
                      <p className="text-sm text-gray-500">
                        {selectedVersion === 0 && getTotalVersions() > 0
                          ? `${getTotalVersions()} feedback versions available`
                          : "No feedback available"}
                      </p>
                    )}
                  </div>
                </div>

                {/* References Section */}
                <div>
                  <h5 className="font-medium text-sm mb-3">References</h5>
                  <div className="space-y-3">
                    {taskAiData.references?.map((reference, index) => (
                      <div key={index} className="flex gap-3 items-start">
                        {reference.icon_url && (
                          <img src={reference.icon_url} className="w-5 h-5 mt-1" alt="" />
                        )}
                        <div>
                          <a 
                            href={reference.url} 
                            target="_blank"
                            rel="noopener noreferrer" 
                            className="text-sm font-medium text-gray-900 hover:underline block"
                          >
                            {reference.title}
                          </a>
                          <div className="text-sm text-gray-600 mt-1">
                            {reference.description}
                          </div>
                        </div>
                      </div>
                    ))}
                    {!taskAiData.references?.length && (
                      <p className="text-sm text-gray-500">No references available</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Only show locked version message when version is locked */}
      {isVersionLocked && (
        <div className="mt-4 p-3 bg-gray-100 rounded-lg text-sm text-gray-600 flex items-center gap-2">
          <Lock className="w-4 h-4" />
          This version is locked. No new feedback can be added.
        </div>
      )}
    </div>
  );
};

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="p-4 bg-red-50 text-red-700 rounded-lg">
        <p>{error}</p>
        <button 
          onClick={() => setError(null)} 
          className="mt-2 px-4 py-2 bg-red-100 rounded-lg hover:bg-red-200"
        >
          Dismiss
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-white">
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="text-lg font-semibold">SECURITY RECOMMENDATIONS</h2>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 px-3 py-1 text-sm bg-gray-100 rounded-lg">
                <Filter className="w-4 h-4" />
                Filter
                <ChevronDown className="w-3 h-3 ml-1" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56">
              <div className="p-2 font-semibold text-sm">Severity</div>
              <DropdownMenuCheckboxItem
                checked={selectedSeverity.includes('critical')}
                onCheckedChange={(checked) =>
                  setSelectedSeverity(checked 
                    ? [...selectedSeverity, 'critical'] 
                    : selectedSeverity.filter(s => s !== 'critical')
                  )
                }
              >
                Critical
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={selectedSeverity.includes('high')}
                onCheckedChange={(checked) =>
                  setSelectedSeverity(checked 
                    ? [...selectedSeverity, 'high'] 
                    : selectedSeverity.filter(s => s !== 'high')
                  )
                }
              >
                High
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={selectedSeverity.includes('medium')}
                onCheckedChange={(checked) =>
                  setSelectedSeverity(checked 
                    ? [...selectedSeverity, 'medium'] 
                    : selectedSeverity.filter(s => s !== 'medium')
                  )
                }
              >
                Medium
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={selectedSeverity.includes('low')}
                onCheckedChange={(checked) =>
                  setSelectedSeverity(checked 
                    ? [...selectedSeverity, 'low'] 
                    : selectedSeverity.filter(s => s !== 'low')
                  )
                }
              >
                Low
              </DropdownMenuCheckboxItem>
              
              <DropdownMenuSeparator />
              
              <div className="p-2 font-semibold text-sm">Source</div>
              <DropdownMenuCheckboxItem
                checked={selectedSource.includes('GuardDuty')}
                onCheckedChange={(checked) =>
                  setSelectedSource(checked 
                    ? [...selectedSource, 'GuardDuty'] 
                    : selectedSource.filter(s => s !== 'GuardDuty')
                  )
                }
              >
                Guard Duty
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={selectedSource.includes('ScoutSuite')}
                onCheckedChange={(checked) =>
                  setSelectedSource(checked 
                    ? [...selectedSource, 'ScoutSuite'] 
                    : selectedSource.filter(s => s !== 'ScoutSuite')
                  )
                }
              >
                Scout Suite
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={selectedSource.includes('CloudChecker')}
                onCheckedChange={(checked) =>
                  setSelectedSource(checked 
                    ? [...selectedSource, 'CloudChecker'] 
                    : selectedSource.filter(s => s !== 'CloudChecker')
                  )
                }
              >
                Cloud Checker
              </DropdownMenuCheckboxItem>
              
              <DropdownMenuSeparator />
              
              <div className="p-2 font-semibold text-sm">Status</div>
              <DropdownMenuCheckboxItem
                checked={selectedStatus.includes('pending')}
                onCheckedChange={(checked) =>
                  setSelectedStatus(checked 
                    ? [...selectedStatus, 'pending'] 
                    : selectedStatus.filter(s => s !== 'pending')
                  )
                }
              >
                Pending
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={selectedStatus.includes('in_progress')}
                onCheckedChange={(checked) =>
                  setSelectedStatus(checked 
                    ? [...selectedStatus, 'in_progress'] 
                    : selectedStatus.filter(s => s !== 'in_progress')
                  )
                }
              >
                In Progress
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={selectedStatus.includes('completed')}
                onCheckedChange={(checked) =>
                  setSelectedStatus(checked 
                    ? [...selectedStatus, 'completed'] 
                    : selectedStatus.filter(s => s !== 'completed')
                  )
                }
              >
                Ready for Implementation
              </DropdownMenuCheckboxItem>
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
                      className={`w-4 h-4 transition-transform ${
                        expandedTask === task.security_task_id ? 'transform rotate-180' : ''
                      }`}
                    />
                    {task.name}
                  </TableCell>
                  <TableCell>
                    <Badge className={severityColors[task.severity]}>
                      {task.severity}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {task.source === 'GuardDuty' ? 'Guard Duty' : 
                     task.source === 'CloudChecker' ? 'Cloud checker' : 
                     'Scout suite'}
                  </TableCell>
                  <TableCell>
                    <Select
                      value={task.status}
                      onValueChange={(value) => handleStatusChange(task.security_task_id, value, event)}
                      onOpenChange={(open) => {
                        if (open) event.stopPropagation();
                      }}
                    >
                      <SelectTrigger className="w-[130px] h-8 text-xs" onClick={(e) => e.stopPropagation()}>
                        <SelectValue>
                          <div className={
                            task.status === 'completed' ? 'text-green-600' :
                            task.status === 'in_progress' ? 'text-orange-500' : 
                            'text-yellow-500'
                          }>
                            <div className="flex items-center gap-2">
                              {statusIcons[task.status]}
                              {task.status === 'completed' ? 'Ready for Implementation' : 
                               task.status === 'in_progress' ? 'In Progress' : 
                               'Pending'}
                            </div>
                          </div>
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent onClick={(e) => e.stopPropagation()}>
                        <SelectItem value="pending">
                          <div className="flex items-center gap-2 text-yellow-500">
                            <Clock className="w-4 h-4" />
                            Pending
                          </div>
                        </SelectItem>
                        <SelectItem value="in_progress">
                          <div className="flex items-center gap-2 text-orange-500">
                            <AlertCircle className="w-4 h-4" />
                            In Progress
                          </div>
                        </SelectItem>
                        <SelectItem value="completed">
                          <div className="flex items-center gap-2 text-green-600">
                            <CheckCircle className="w-4 h-4" />
                            Ready for Implementation
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Select
                      value={task.assigned_to || ""}
                      onValueChange={(value) => handleAssignToHuman(task.security_task_id, value, event)}
                      onOpenChange={(open) => {
                        if (open) event.stopPropagation();
                      }}
                    >
                      <SelectTrigger className="w-[120px] h-8 text-xs" onClick={(e) => e.stopPropagation()}>
                        <SelectValue placeholder="Assign to">
                          {task.assigned_to ? (
                            <div className="flex items-center space-x-1">
                              <span className="text-sm">👤</span>
                              <span className="text-xs">{task.assigned_to}</span>
                            </div>
                          ) : (
                            "Assign to"
                          )}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent onClick={(e) => e.stopPropagation()}>
                        {humanOptions.map(option => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    {task.authority_level === 'executing_by_ai' && (
                      <div className="bg-slate-50 w-8 h-8 rounded-full" />
                    )}
                  </TableCell>
                  <TableCell>{format(new Date(task.created_date), 'MMM dd, yyyy')}</TableCell>
                  <TableCell>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button 
                          variant="outline" 
                          className="w-[130px] h-8 text-xs justify-start py-1 px-2"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <CalendarIcon className="mr-2 h-3 w-3" />
                          {task.due_date ? (
                            format(new Date(task.due_date), 'MMM dd, yyyy')
                          ) : (
                            <span>Set due date</span>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start" onClick={(e) => e.stopPropagation()}>
                        <Calendar
                          mode="single"
                          selected={task.due_date ? new Date(task.due_date) : undefined}
                          onSelect={(date) => handleUpdateDueDate(task.security_task_id, date, event)}
                        />
                      </PopoverContent>
                    </Popover>
                  </TableCell>
                  <TableCell>
                    {task.authority_level === 'executing_by_ai' ? 'Executing By AI' : 'Executing By Human'}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={
                      task.risk_classification === 'high' ? 'text-red-700 border-red-200' :
                      task.risk_classification === 'moderate' ? 'text-orange-700 border-orange-200' :
                      'text-green-700 border-green-200'
                    }>
                      {task.risk_classification}
                    </Badge>
                  </TableCell>
                </TableRow>
                {expandedTask === task.security_task_id && (
                  <TableRow>
                    <TableCell colSpan={10} className="p-0">
                      <ResourceDetails task={task} />
                    </TableCell>
                  </TableRow>
                )}
              </React.Fragment>
            ))}
          </TableBody>
        </Table>
      </div>
      <div className="p-2 text-sm text-gray-600 border-t">
        Showing 1 to {filteredTasks.length} of {tasks.length} entries
      </div>
    </div>
  );
}
