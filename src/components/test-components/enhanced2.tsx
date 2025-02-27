import React, { useState } from 'react';
import { 
  Clock, 
  Search, 
  MessageSquare, 
  Phone, 
  Tag, 
  Brain,
  Target,
  Calendar,
  BarChart,
  CheckCircle, 
  Flame,
  ArrowUpRight,
  BarChart2,
  Command,
  Filter,
  ChevronDown,
  X,
  Sparkles,
  BookOpen,
  PlusCircle,
  Volume,
  ArrowRight,
  MoreHorizontal
} from 'lucide-react';

const EnhancedSidebar = () => {
  const [activeTab, setActiveTab] = useState('timeline');
  const [expandedSections, setExpandedSections] = useState({
    'today': true,
    'yesterday': true,
    'thisWeek': false,
    'workGoals': true,
    'personalGoals': true,
    'habits': true
  });
  
  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  return (
    <div className="flex flex-col h-full w-full bg-gray-50 border-r border-gray-200">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 bg-white">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="flex aspect-square h-8 items-center justify-center rounded-lg bg-purple-600 text-white">
              <Command className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold">Rivena AI</h2>
              <p className="text-xs text-gray-500">Your Companion</p>
            </div>
          </div>
        </div>
        
        <div className="relative w-full">
          <input 
            type="text" 
            placeholder="Search conversations..." 
            className="w-full pl-8 pr-4 py-2 rounded-lg border border-gray-300 text-sm"
          />
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 bg-white">
        <button 
          className={`flex-1 py-2 px-3 text-sm font-medium flex items-center justify-center gap-1.5 ${activeTab === 'timeline' ? 'text-purple-600 border-b-2 border-purple-600' : 'text-gray-500'}`}
          onClick={() => setActiveTab('timeline')}
        >
          <Clock className="h-3.5 w-3.5" />
          <span>Timeline</span>
        </button>
        <button 
          className={`flex-1 py-2 px-3 text-sm font-medium flex items-center justify-center gap-1.5 ${activeTab === 'goals' ? 'text-purple-600 border-b-2 border-purple-600' : 'text-gray-500'}`}
          onClick={() => setActiveTab('goals')}
        >
          <Target className="h-3.5 w-3.5" />
          <span>Goals</span>
        </button>
        <button 
          className={`flex-1 py-2 px-3 text-sm font-medium flex items-center justify-center gap-1.5 ${activeTab === 'memories' ? 'text-purple-600 border-b-2 border-purple-600' : 'text-gray-500'}`}
          onClick={() => setActiveTab('memories')}
        >
          <Brain className="h-3.5 w-3.5" />
          <span>Memories</span>
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Timeline Tab */}
        {activeTab === 'timeline' && (
          <div className="h-full">
            <div className="p-3 flex justify-between items-center">
              <h3 className="text-sm font-medium text-gray-700">Conversation History</h3>
              <button className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded">
                <Filter className="h-4 w-4" />
              </button>
            </div>
            
            {/* Today's Conversation Blocks */}
            <div className="mb-4">
              <div 
                className="px-3 py-2 bg-gray-100 border-y border-gray-200 flex justify-between items-center cursor-pointer hover:bg-gray-200"
                onClick={() => toggleSection('today')}
              >
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-gray-600" />
                  <span className="text-sm font-medium">Today</span>
                </div>
                <ChevronDown className={`h-4 w-4 text-gray-600 transition-transform ${expandedSections.today ? 'rotate-180' : ''}`} />
              </div>
              
              {expandedSections.today && (
                <div className="space-y-1 py-2">
                  {/* Conversation Summary Block */}
                  <div className="px-3 py-2 mx-2 rounded-lg border-l-4 border-purple-500 bg-white hover:bg-gray-50 cursor-pointer">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5">
                        <span className="font-medium text-sm">Morning Check-in</span>
                        <span className="text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded">Topic</span>
                      </div>
                      <span className="text-xs text-gray-500">9:15 AM</span>
                    </div>
                    <p className="text-xs text-gray-600 line-clamp-2">
                      Discussed goals for the week, focusing on your presentation and workout schedule. Set reminders for gym sessions.
                    </p>
                    <div className="flex items-center mt-1.5 gap-2">
                      <div className="flex -space-x-2">
                        <div className="w-5 h-5 rounded-full bg-green-200 flex items-center justify-center text-[8px] font-bold text-green-700">W</div>
                        <div className="w-5 h-5 rounded-full bg-blue-200 flex items-center justify-center text-[8px] font-bold text-blue-700">E</div>
                      </div>
                      <span className="text-[10px] text-gray-500">Work, Exercise</span>
                    </div>
                  </div>
                  
                  {/* Voice Session Block */}
                  <div className="px-3 py-2 mx-2 rounded-lg border-l-4 border-blue-500 bg-white hover:bg-gray-50 cursor-pointer">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5">
                        <Phone className="h-3.5 w-3.5 text-blue-600" />
                        <span className="font-medium text-sm">Voice Session</span>
                      </div>
                      <span className="text-xs text-gray-500">12:30 PM</span>
                    </div>
                    <p className="text-xs text-gray-600 line-clamp-2">
                      12-minute conversation about managing work stress and balancing priorities.
                    </p>
                    <div className="mt-1.5 flex items-center text-xs gap-2">
                      <button className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Volume className="h-3 w-3" />
                        <span>Play</span>
                      </button>
                      <button className="bg-gray-50 text-gray-600 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <BookOpen className="h-3 w-3" />
                        <span>Transcript</span>
                      </button>
                    </div>
                  </div>
                  
                  {/* Afternoon Thoughts Block */}
                  <div className="px-3 py-2 mx-2 rounded-lg border-l-4 border-green-500 bg-white hover:bg-gray-50 cursor-pointer">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5">
                        <MessageSquare className="h-3.5 w-3.5 text-green-600" />
                        <span className="font-medium text-sm">Afternoon Reflections</span>
                      </div>
                      <span className="text-xs text-gray-500">3:45 PM</span>
                    </div>
                    <p className="text-xs text-gray-600 line-clamp-2">
                      Shared thoughts about the book "Atomic Habits" and how to apply its principles to daily routine.
                    </p>
                    <div className="flex items-center mt-1.5 gap-2">
                      <div className="flex -space-x-2">
                        <div className="w-5 h-5 rounded-full bg-indigo-200 flex items-center justify-center text-[8px] font-bold text-indigo-700">R</div>
                        <div className="w-5 h-5 rounded-full bg-pink-200 flex items-center justify-center text-[8px] font-bold text-pink-700">H</div>
                      </div>
                      <span className="text-[10px] text-gray-500">Reading, Habits</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            {/* Yesterday's Conversation Blocks */}
            <div className="mb-4">
              <div 
                className="px-3 py-2 bg-gray-100 border-y border-gray-200 flex justify-between items-center cursor-pointer hover:bg-gray-200"
                onClick={() => toggleSection('yesterday')}
              >
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-gray-600" />
                  <span className="text-sm font-medium">Yesterday</span>
                </div>
                <ChevronDown className={`h-4 w-4 text-gray-600 transition-transform ${expandedSections.yesterday ? 'rotate-180' : ''}`} />
              </div>
              
              {expandedSections.yesterday && (
                <div className="space-y-1 py-2">
                  {/* Daily Summary Block */}
                  <div className="px-3 py-2 mx-2 rounded-lg border-l-4 border-amber-500 bg-white hover:bg-gray-50 cursor-pointer">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5">
                        <Sparkles className="h-3.5 w-3.5 text-amber-600" />
                        <span className="font-medium text-sm">Daily Summary</span>
                      </div>
                      <span className="text-xs text-gray-500">Jun 24</span>
                    </div>
                    <p className="text-xs text-gray-600 line-clamp-2">
                      3 conversations throughout the day covering work projects, meditation practice, and weekend plans.
                    </p>
                    <div className="mt-1.5">
                      <button className="text-purple-600 text-xs flex items-center gap-0.5">
                        <span>View all conversations</span>
                        <ArrowRight className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                  
                  {/* Voice Session Block */}
                  <div className="px-3 py-2 mx-2 rounded-lg border-l-4 border-blue-500 bg-white hover:bg-gray-50 cursor-pointer">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5">
                        <Phone className="h-3.5 w-3.5 text-blue-600" />
                        <span className="font-medium text-sm">Voice Session</span>
                      </div>
                      <span className="text-xs text-gray-500">8:20 PM</span>
                    </div>
                    <p className="text-xs text-gray-600 line-clamp-2">
                      18-minute conversation about upcoming travel plans to Europe and packing recommendations.
                    </p>
                    <div className="mt-1.5 flex items-center text-xs gap-2">
                      <button className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Volume className="h-3 w-3" />
                        <span>Play</span>
                      </button>
                      <button className="bg-gray-50 text-gray-600 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <BookOpen className="h-3 w-3" />
                        <span>Transcript</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            {/* This Week Conversation Blocks */}
            <div className="mb-4">
              <div 
                className="px-3 py-2 bg-gray-100 border-y border-gray-200 flex justify-between items-center cursor-pointer hover:bg-gray-200"
                onClick={() => toggleSection('thisWeek')}
              >
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-gray-600" />
                  <span className="text-sm font-medium">This Week</span>
                </div>
                <ChevronDown className={`h-4 w-4 text-gray-600 transition-transform ${expandedSections.thisWeek ? 'rotate-180' : ''}`} />
              </div>
              
              {expandedSections.thisWeek && (
                <div className="space-y-1 py-2">
                  {/* Topic Group Block */}
                  <div className="px-3 py-2 mx-2 rounded-lg border-l-4 border-indigo-500 bg-white hover:bg-gray-50 cursor-pointer">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5">
                        <Tag className="h-3.5 w-3.5 text-indigo-600" />
                        <span className="font-medium text-sm">Career Development</span>
                      </div>
                      <span className="text-xs text-gray-500">Jun 21-23</span>
                    </div>
                    <p className="text-xs text-gray-600 line-clamp-2">
                      4 conversations about your interest in data science, potential courses, and career transition strategies.
                    </p>
                    <div className="mt-1.5 flex items-center text-xs">
                      <div className="flex items-center gap-1 text-gray-500">
                        <MessageSquare className="h-3 w-3" />
                        <span>3 text chats</span>
                      </div>
                      <span className="mx-2 text-gray-300">•</span>
                      <div className="flex items-center gap-1 text-gray-500">
                        <Phone className="h-3 w-3" />
                        <span>1 voice call</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Weekly Summary Block */}
                  <div className="px-3 py-2 mx-2 rounded-lg border-l-4 border-amber-500 bg-white hover:bg-gray-50 cursor-pointer">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5">
                        <Sparkles className="h-3.5 w-3.5 text-amber-600" />
                        <span className="font-medium text-sm">Weekly Review</span>
                      </div>
                      <span className="text-xs text-gray-500">Jun 19</span>
                    </div>
                    <p className="text-xs text-gray-600 line-clamp-2">
                      Summary of progress on goals, habit streaks, and key insights from our conversations this week.
                    </p>
                    <div className="mt-1.5">
                      <div className="flex h-1.5 w-full rounded-full bg-gray-100 overflow-hidden">
                        <div className="bg-green-500 w-3/4 h-full"></div>
                        <div className="bg-amber-500 w-1/6 h-full"></div>
                        <div className="bg-red-500 w-1/12 h-full"></div>
                      </div>
                      <div className="flex justify-between mt-1 text-[10px] text-gray-500">
                        <span>12 goals progressed</span>
                        <span>3 completed</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* Goals Tab */}
        {activeTab === 'goals' && (
          <div className="h-full">
            <div className="p-3 flex justify-between items-center">
              <h3 className="text-sm font-medium text-gray-700">Progress Tracking</h3>
              <button className="p-1 text-purple-600 hover:bg-purple-50 rounded">
                <PlusCircle className="h-4 w-4" />
              </button>
            </div>
            
            {/* Progress Overview */}
            <div className="px-3 pt-2 pb-4 border-b border-gray-200">
              <div className="bg-white rounded-lg p-3 border border-gray-200 mb-3">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="text-sm font-medium">Current Progress</h4>
                  <button className="text-xs text-purple-600">View All</button>
                </div>
                <div className="space-y-2">
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-600">Active Goals</span>
                      <span className="font-medium">8 goals</span>
                    </div>
                    <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="bg-purple-500 h-full" style={{width: '65%'}}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-600">Habit Consistency</span>
                      <span className="font-medium">87%</span>
                    </div>
                    <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="bg-green-500 h-full" style={{width: '87%'}}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-600">Weekly Check-ins</span>
                      <span className="font-medium">5/7 days</span>
                    </div>
                    <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="bg-blue-500 h-full" style={{width: '71%'}}></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Work Goals */}
            <div className="mb-4">
              <div 
                className="px-3 py-2 bg-gray-100 border-y border-gray-200 flex justify-between items-center cursor-pointer hover:bg-gray-200"
                onClick={() => toggleSection('workGoals')}
              >
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-gray-600" />
                  <span className="text-sm font-medium">Work Goals</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">3 active</span>
                  <ChevronDown className={`h-4 w-4 text-gray-600 transition-transform ${expandedSections.workGoals ? 'rotate-180' : ''}`} />
                </div>
              </div>
              
              {expandedSections.workGoals && (
                <div className="space-y-2 py-2">
                  <div className="px-3 py-2 mx-2 rounded-lg bg-white border border-gray-200 hover:shadow-sm transition-shadow">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <h4 className="text-sm font-medium truncate">Complete Project Presentation</h4>
                        </div>
                        <div className="flex items-center mt-1">
                          <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div className="bg-green-500 h-full" style={{width: '80%'}}></div>
                          </div>
                          <span className="ml-2 text-xs text-gray-500">80%</span>
                        </div>
                      </div>
                      <MoreHorizontal className="h-4 w-4 text-gray-400 shrink-0 ml-2" />
                    </div>
                    <div className="mt-2 flex justify-between items-center">
                      <span className="text-xs text-gray-500">Due: Jun 30, 2024</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded">Work</span>
                        <span className="text-xs bg-purple-50 text-purple-600 px-1.5 py-0.5 rounded">Priority</span>
                      </div>
                    </div>
                    <button className="mt-2 text-xs text-purple-600 flex items-center gap-0.5">
                      <span>View 3 milestones</span>
                      <ArrowRight className="h-3 w-3" />
                    </button>
                  </div>
                  
                  <div className="px-3 py-2 mx-2 rounded-lg bg-white border border-gray-200 hover:shadow-sm transition-shadow">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <CheckCircle className="h-4 w-4 text-amber-500" />
                          <h4 className="text-sm font-medium truncate">Complete Data Analysis Course</h4>
                        </div>
                        <div className="flex items-center mt-1">
                          <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div className="bg-amber-500 h-full" style={{width: '45%'}}></div>
                          </div>
                          <span className="ml-2 text-xs text-gray-500">45%</span>
                        </div>
                      </div>
                      <MoreHorizontal className="h-4 w-4 text-gray-400 shrink-0 ml-2" />
                    </div>
                    <div className="mt-2 flex justify-between items-center">
                      <span className="text-xs text-gray-500">Due: Jul 15, 2024</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded">Work</span>
                        <span className="text-xs bg-green-50 text-green-600 px-1.5 py-0.5 rounded">Learning</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            {/* Personal Goals */}
            <div className="mb-4">
              <div 
                className="px-3 py-2 bg-gray-100 border-y border-gray-200 flex justify-between items-center cursor-pointer hover:bg-gray-200"
                onClick={() => toggleSection('personalGoals')}
              >
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-gray-600" />
                  <span className="text-sm font-medium">Personal Goals</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">2 active</span>
                  <ChevronDown className={`h-4 w-4 text-gray-600 transition-transform ${expandedSections.personalGoals ? 'rotate-180' : ''}`} />
                </div>
              </div>
              
              {expandedSections.personalGoals && (
                <div className="space-y-2 py-2">
                  <div className="px-3 py-2 mx-2 rounded-lg bg-white border border-gray-200 hover:shadow-sm transition-shadow">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <CheckCircle className="h-4 w-4 text-blue-500" />
                          <h4 className="text-sm font-medium truncate">Train for Half Marathon</h4>
                        </div>
                        <div className="flex items-center mt-1">
                          <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div className="bg-blue-500 h-full" style={{width: '60%'}}></div>
                          </div>
                          <span className="ml-2 text-xs text-gray-500">60%</span>
                        </div>
                      </div>
                      <MoreHorizontal className="h-4 w-4 text-gray-400 shrink-0 ml-2" />
                    </div>
                    <div className="mt-2 flex justify-between items-center">
                      <span className="text-xs text-gray-500">Due: Sep 15, 2024</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs bg-pink-50 text-pink-600 px-1.5 py-0.5 rounded">Fitness</span>
                      </div>
                    </div>
                    <div className="mt-2 bg-gray-50 rounded p-2">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-gray-600">Weekly Progress</span>
                      </div>
                      <div className="flex h-6 items-end gap-1">
                        {[65, 40, 80, 55, 90, 70, 0].map((height, i) => (
                          <div key={i} className="flex-1 flex flex-col items-center">
                            <div 
                              className={`w-full rounded-sm ${i === 6 ? 'bg-gray-200' : 'bg-blue-400'}`} 
                              style={{height: `${height * 0.06}rem`}}
                            ></div>
                            <span className="text-[8px] mt-1 text-gray-500">{['M', 'T', 'W', 'T', 'F', 'S', 'S'][i]}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            {/* Habits */}
            <div className="mb-4">
              <div 
                className="px-3 py-2 bg-gray-100 border-y border-gray-200 flex justify-between items-center cursor-pointer hover:bg-gray-200"
                onClick={() => toggleSection('habits')}
              >
                <div className="flex items-center gap-2">
                  <Flame className="h-4 w-4 text-gray-600" />
                  <span className="text-sm font-medium">Habits</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">3 active</span>
                  <ChevronDown className={`h-4 w-4 text-gray-600 transition-transform ${expandedSections.habits ? 'rotate-180' : ''}`} />
                </div>
              </div>
              
              {expandedSections.habits && (
                <div className="space-y-2 py-2">
                  <div className="px-3 py-2 mx-2 rounded-lg bg-white border border-gray-200 hover:shadow-sm transition-shadow">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Flame className="h-4 w-4 text-red-500" />
                        <h4 className="text-sm font-medium">Morning Meditation</h4>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-xs font-medium text-blue-600">30</span>
                        <span className="text-xs text-gray-500">day streak</span>
                      </div>
                    </div>
                    
                    <div className="mt-2 grid grid-cols-7 gap-1">
                      {Array(7).fill(0).map((_, i) => (
                        <div key={i} className="flex flex-col items-center">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center ${i < 6 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}`}>
                            <CheckCircle className="h-3.5 w-3.5" />
                          </div>
                          <span className="text-[8px] mt-1 text-gray-500">{['M', 'T', 'W', 'T', 'F', 'S', 'S'][i]}</span>
                        </div>
                      ))}
                    </div>
                    
                    <div className="mt-3 text-xs text-gray-500 flex justify-between">
                      <span>Target: Daily, 10 minutes</span>
                      <div className="flex items-center">
                        <BarChart className="h-3 w-3 mr-1" />
                        <span>View Stats</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="px-3 py-2 mx-2 rounded-lg bg-white border border-gray-200 hover:shadow-sm transition-shadow">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Flame className="h-4 w-4 text-orange-500" />
                        <h4 className="text-sm font-medium">Reading</h4>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-xs font-medium text-blue-600">12</span>
                        <span className="text-xs text-gray-500">day streak</span>
                      </div>
                    </div>
                    
                    <div className="mt-2 grid grid-cols-7 gap-1">
                      {Array(7).fill(0).map((_, i) => (
                        <div key={i} className="flex flex-col items-center">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center ${i < 4 || i === 5 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}`}>
                            {i < 4 || i === 5 ? (
                              <CheckCircle className="h-3.5 w-3.5" />
                            ) : (
                              <X className="h-3.5 w-3.5" />
                            )}
                          </div>
                          <span className="text-[8px] mt-1 text-gray-500">{['M', 'T', 'W', 'T', 'F', 'S', 'S'][i]}</span>
                        </div>
                      ))}
                    </div>
                    
                    <div className="mt-3 text-xs text-gray-500 flex justify-between">
                      <span>Target: 5 days/week, 20 pages</span>
                      <div className="flex items-center">
                        <BarChart className="h-3 w-3 mr-1" />
                        <span>View Stats</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* Memories Tab Placeholder */}
        {activeTab === 'memories' && (
          <div className="h-full p-3">
            <h3 className="text-sm font-medium text-gray-700 mb-3">What I Know About You</h3>
            <p className="text-sm text-gray-600 mb-4">
              This tab will show the personal information, preferences, and patterns I've learned about you during our conversations.
            </p>
            <div className="bg-purple-50 rounded-lg p-3 text-purple-800 text-xs">
              <p>
                The Memories feature is being refined based on your conversations and feedback. This will help me better understand your needs and preferences.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EnhancedSidebar;