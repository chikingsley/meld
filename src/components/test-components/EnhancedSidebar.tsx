// src/components/sidebar/EnhancedSidebar.tsx
import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Command, 
  Clock, 
  Search, 
  MessageSquare, 
  Phone, 
  Tag, 
  ChevronDown,
  Brain,
  User,
  Heart,
  Target,
  AlertCircle,
  Lightbulb,
  Star,
  Award,
  Filter,
  LogIn,
  Calendar,
  BarChart3,
  Sparkles,
  PenLine
} from "lucide-react";
import { SignInButton, SignedIn, SignedOut, useUser } from "@clerk/clerk-react";
import { NavUser } from "@/components/sidebar/nav-user";
import { TextVoiceSwitch } from "@/components/ui/text-voice-switch";
import { 
  Sidebar, 
  SidebarContent, 
  SidebarFooter, 
  SidebarHeader,
  SidebarMenu, 
  SidebarMenuButton, 
  SidebarMenuItem 
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useNavigate } from "react-router-dom";
import { format, isToday, isYesterday, isSameWeek, parseISO } from "date-fns";
import { sessionStore, StoredSession } from "@/db/session-store";
import { useSessionContext } from "@/providers/SessionProvider";
import { useVoiceDisconnect } from "@/components/sidebar/session-handler";

// Types for timeline items and memories
interface TimelineItem {
  id: string;
  title: string;
  preview: string;
  description: string;
  timestamp: string;
  type: 'message' | 'voice' | 'topic';
  date: Date;
  isActive: boolean;
  sessionId: string;
}

interface Memory {
  id: string;
  content: string;
  type: string;
  confidence: number;
  learnedAt: Date;
  sources: string[];
}

// Context menu for actions on memories
const MemoryActions = ({ memory }: { memory: Memory }) => {
  return (
    <div className="absolute right-0 top-1 opacity-0 group-hover:opacity-100 transition-opacity">
      <div className="flex gap-1">
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-6 w-6 text-muted-foreground hover:text-foreground"
          title="Edit memory"
        >
          <PenLine className="h-3 w-3" />
        </Button>
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-6 w-6 text-muted-foreground hover:text-foreground"
          title="View related conversations"
        >
          <MessageSquare className="h-3 w-3" />
        </Button>
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-6 w-6 text-muted-foreground hover:text-destructive"
          title="Remove memory"
        >
          <AlertCircle className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
};

// Timeline Item Component
const TimelineItem = ({ 
  item, 
  onClick 
}: { 
  item: TimelineItem;
  onClick: (id: string, sessionId: string) => void;
}) => {
  const getBorderColor = () => {
    switch (item.type) {
      case 'voice': return 'border-blue-500';
      case 'topic': return 'border-amber-500';
      default: return 'border-green-500';
    }
  };

  const getIcon = () => {
    switch (item.type) {
      case 'voice': return <Phone className="h-4 w-4 text-blue-500 mr-2" />;
      case 'topic': return <Tag className="h-4 w-4 text-amber-500 mr-2" />;
      default: return <MessageSquare className="h-4 w-4 text-green-500 mr-2" />;
    }
  };

  const getActiveClass = () => {
    if (item.isActive) {
      switch (item.type) {
        case 'voice': return 'bg-blue-50';
        case 'topic': return 'bg-amber-50';
        default: return 'bg-green-50';
      }
    }
    return 'hover:bg-gray-100';
  };

  return (
    <SidebarMenuItem className={`group/item relative ${getActiveClass()}`}>
      <div className="flex items-center gap-2">
        <SidebarMenuButton
          onClick={() => onClick(item.id, item.sessionId)}
          size="lg"
          className={`flex-1 transition-colors group-hover/item:pr-4 border-l-4 ${getBorderColor()}`}
        >
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center">
              {getIcon()}
              <span className="truncate font-medium">{item.title}</span>
            </div>
            {/* Description */}
            <p className="text-xs text-gray-600 truncate">{item.description || "12 minutes from description"}</p>
          </div>
        </SidebarMenuButton>
        <span className="text-xs text-muted-foreground/80 pb-5 pr-2">{item.timestamp}</span>
      </div>
    </SidebarMenuItem>
  );
};

// Group Header Component with expand/collapse functionality
const CollapsibleGroupHeader = ({ 
  label, 
  count,
  isOpen, 
  onToggle,
  icon: Icon
}: { 
  label: string; 
  count?: number;
  isOpen: boolean; 
  onToggle: () => void;
  icon: React.ElementType;
}) => (
  <div 
    className="px-3 py-2 bg-gray-50 border-t border-b border-gray-200 cursor-pointer hover:bg-gray-100"
    onClick={onToggle}
  >
    <div className="flex items-center justify-between">
      <div className="flex items-center">
        <Icon className="h-4 w-4 text-gray-500 mr-2" />
        <span className="font-medium text-gray-800">{label}</span>
        {count !== undefined && (
          <span className="ml-1.5 text-xs bg-gray-200 text-gray-700 px-1.5 rounded-full">
            {count}
          </span>
        )}
      </div>
      <ChevronDown 
        className={`h-4 w-4 text-gray-500 transition-transform ${isOpen ? 'transform rotate-180' : ''}`} 
      />
    </div>
  </div>
);

// Memory Item Component
const MemoryItem = ({ memory }: { memory: Memory }) => {
  const getMemoryIcon = () => {
    switch (memory.type) {
      case 'fact': return <User className="h-4 w-4 text-blue-500" />;
      case 'preference': return <Heart className="h-4 w-4 text-pink-500" />;
      case 'goal': return <Target className="h-4 w-4 text-green-500" />;
      case 'insight': return <Lightbulb className="h-4 w-4 text-amber-500" />;
      case 'achievement': return <Award className="h-4 w-4 text-purple-500" />;
      default: return <Brain className="h-4 w-4 text-gray-500" />;
    }
  };

  return (
    <div className="py-2 pl-4 pr-2 mb-2 hover:bg-gray-100 rounded-lg cursor-pointer group relative">
      <div className="flex items-start gap-2">
        <div className="mt-0.5">{getMemoryIcon()}</div>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-gray-800">{memory.content}</p>
          <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span>Learned {format(memory.learnedAt, 'MMM d')}</span>
            <span className="text-xs bg-gray-200 rounded-full px-1.5 ml-1">
              {Math.round(memory.confidence * 100)}%
            </span>
          </p>
        </div>
      </div>
      <MemoryActions memory={memory} />
    </div>
  );
};

// Generate example memories
const generateExampleMemories = (): Record<string, Memory[]> => {
  return {
    facts: [
      {
        id: 'fact-1',
        content: "Your sister Emma lives in Boston and works as a graphic designer",
        type: 'fact',
        confidence: 0.95,
        learnedAt: parseISO('2024-02-15'),
        sources: ['session-123']
      },
      {
        id: 'fact-2',
        content: "You're allergic to peanuts but not other nuts",
        type: 'fact',
        confidence: 0.88,
        learnedAt: parseISO('2024-02-10'),
        sources: ['session-125']
      },
      {
        id: 'fact-3',
        content: "You graduated from University of Michigan with a degree in Computer Science",
        type: 'fact',
        confidence: 0.92,
        learnedAt: parseISO('2024-01-20'),
        sources: ['session-110']
      }
    ],
    preferences: [
      {
        id: 'pref-1',
        content: "You prefer science fiction and historical fiction books",
        type: 'preference',
        confidence: 0.85,
        learnedAt: parseISO('2024-02-20'),
        sources: ['session-128']
      },
      {
        id: 'pref-2',
        content: "You enjoy yoga and running for exercise",
        type: 'preference',
        confidence: 0.78,
        learnedAt: parseISO('2024-02-05'),
        sources: ['session-118']
      }
    ],
    goals: [
      {
        id: 'goal-1',
        content: "Training for a half marathon in September",
        type: 'goal',
        confidence: 0.9,
        learnedAt: parseISO('2024-02-18'),
        sources: ['session-127']
      },
      {
        id: 'goal-2',
        content: "Learning Spanish with a goal of basic conversation by summer",
        type: 'goal',
        confidence: 0.85,
        learnedAt: parseISO('2024-01-15'),
        sources: ['session-105']
      }
    ],
    insights: [
      {
        id: 'insight-1',
        content: "You tend to procrastinate when feeling overwhelmed rather than breaking tasks down",
        type: 'insight',
        confidence: 0.75,
        learnedAt: parseISO('2024-02-12'),
        sources: ['session-122', 'session-124']
      },
      {
        id: 'insight-2',
        content: "Your mood improves significantly after morning exercise",
        type: 'insight',
        confidence: 0.82,
        learnedAt: parseISO('2024-02-08'),
        sources: ['session-119', 'session-121']
      }
    ],
    achievements: [
      {
        id: 'achievement-1',
        content: "Meditated consistently for 30 days in a row",
        type: 'achievement',
        confidence: 0.95,
        learnedAt: parseISO('2024-02-22'),
        sources: ['session-130']
      },
      {
        id: 'achievement-2',
        content: "Completed your first 10K race last month",
        type: 'achievement',
        confidence: 0.98,
        learnedAt: parseISO('2024-01-30'),
        sources: ['session-115']
      }
    ],
    relationships: [
      {
        id: 'relationship-1',
        content: "Your best friend Alex has been supportive during your career transition",
        type: 'relationship',
        confidence: 0.88,
        learnedAt: parseISO('2024-02-14'),
        sources: ['session-126']
      },
      {
        id: 'relationship-2',
        content: "You and your partner enjoy hiking and cooking together",
        type: 'relationship',
        confidence: 0.92,
        learnedAt: parseISO('2024-01-25'),
        sources: ['session-112']
      }
    ]
  };
};

// Enhanced Sidebar Component
const EnhancedSidebar = ({ className, ...props }: React.ComponentProps<typeof Sidebar>) => {
  const { user } = useUser();
  const { currentSessionId, deleteSession, selectSession, isVoiceMode, setVoiceMode } = useSessionContext();
  const { disconnectVoice } = useVoiceDisconnect();
  const [sessions, setSessions] = React.useState<StoredSession[]>([]);
  const [searchQuery, setSearchQuery] = React.useState("");
  const navigate = useNavigate();
  
  // Tab state
  const [activeTab, setActiveTab] = React.useState('timeline');
  
  // Collapsible sections state
  const [expandedGroups, setExpandedGroups] = React.useState({
    today: true,
    yesterday: true,
    thisWeek: false,
    earlier: false,
    facts: true,
    preferences: true,
    goals: true,
    insights: false,
    achievements: false,
    relationships: false
  });
  
  // Toggle expansion state of a group
  const toggleGroup = (group: string) => {
    setExpandedGroups(prev => ({
      ...prev,
      [group]: !prev[group]
    }));
  };

  // Example memories
  const memories = React.useMemo(() => generateExampleMemories(), []);

  // Load sessions
  React.useEffect(() => {
    if (user?.id) {
      const userSessions = sessionStore.getUserSessions(user.id);
      setSessions(userSessions);
    }
  }, [user?.id]);

  // Group sessions by date
  const groupedSessions = React.useMemo(() => {
    // Sort sessions by timestamp (newest first)
    const sortedSessions = [...sessions].sort((a, b) => {
      const dateA = new Date(a.timestamp);
      const dateB = new Date(b.timestamp);
      return dateB.getTime() - dateA.getTime();
    });

    // Filter by search query if needed
    const filteredSessions = searchQuery.trim() 
      ? sortedSessions.filter(session => 
          (session.title?.toLowerCase().includes(searchQuery.toLowerCase()) || 
           session.lastMessage?.toLowerCase().includes(searchQuery.toLowerCase()))
        )
      : sortedSessions;

    // Group by date
    const groups = {
      today: [] as TimelineItem[],
      yesterday: [] as TimelineItem[],
      thisWeek: [] as TimelineItem[],
      earlier: [] as TimelineItem[]
    };

    // Convert sessions to timeline items
    filteredSessions.forEach(session => {
      const date = new Date(session.timestamp);
      
      // Determine if this is a voice session
      const isVoiceSession = session.title?.toLowerCase().includes('voice') || false;
      
      // Create timeline item
      const item: TimelineItem = {
        id: session.id,
        title: session.title || 'Untitled Conversation',
        description: "12 minutes from description",
        timestamp: format(date, 'h:mm a'),
        type: isVoiceSession ? 'voice' : Math.random() > 0.7 ? 'topic' : 'message', // Mix of types for demo
        date,
        isActive: session.id === currentSessionId,
        sessionId: session.id
      };
      
      // Add to appropriate group
      if (isToday(date)) {
        groups.today.push(item);
      } else if (isYesterday(date)) {
        groups.yesterday.push(item);
      } else if (isSameWeek(date, new Date())) {
        groups.thisWeek.push(item);
      } else {
        groups.earlier.push(item);
      }
    });

    return groups;
  }, [sessions, searchQuery, currentSessionId]);

  // Handle session selection
  const handleSelectItem = async (itemId: string, sessionId: string) => {
    await disconnectVoice();
    
    // This could be enhanced to scroll to the specific message
    navigate(`/session/${sessionId}?scrollTo=${itemId}`);
    await selectSession(sessionId);
  };

  return (
    <Sidebar variant="inset" className={className} {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <a href="/">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                  <Command className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">Rivena AI</span>
                  <span className="truncate text-xs">Your Companion</span>
                </div>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <div className="mt-2 px-4">
              <div className="relative flex-1">
                <Input
                  type="text"
                  placeholder="Search conversation..."
                  className="w-full pl-8 pr-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-400"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
              </div>
            </div>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      
      <SidebarContent>
        <Tabs defaultValue="timeline" value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-2 mb-2">
            <TabsTrigger value="timeline" className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              <span>Timeline</span>
            </TabsTrigger>
            <TabsTrigger value="memories" className="flex items-center gap-1.5">
              <Brain className="h-3.5 w-3.5" />
              <span>Memories</span>
            </TabsTrigger>
          </TabsList>
          
          {/* Timeline Tab */}
          <TabsContent value="timeline" className="mt-0">
            <div className="flex justify-between items-center px-3 py-2">
              <div className="text-sm font-medium text-muted-foreground">Conversation History</div>
              <Button variant="ghost" size="sm" className="h-7 px-2">
                <Filter className="h-3.5 w-3.5" />
              </Button>
            </div>
            
            <SidebarMenu className="space-y-0 px-0">
              {/* Today group */}
              {groupedSessions.today.length > 0 && (
                <>
                  <CollapsibleGroupHeader 
                    label="Today" 
                    count={groupedSessions.today.length}
                    isOpen={expandedGroups.today} 
                    onToggle={() => toggleGroup('today')}
                    icon={Calendar}
                  />
                  <AnimatePresence>
                    {expandedGroups.today && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        {groupedSessions.today.map(item => (
                          <TimelineItem
                            key={item.id}
                            item={item}
                            onClick={handleSelectItem}
                          />
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </>
              )}

              {/* Yesterday group */}
              {groupedSessions.yesterday.length > 0 && (
                <>
                  <CollapsibleGroupHeader 
                    label="Yesterday" 
                    count={groupedSessions.yesterday.length}
                    isOpen={expandedGroups.yesterday} 
                    onToggle={() => toggleGroup('yesterday')}
                    icon={Calendar}
                  />
                  <AnimatePresence>
                    {expandedGroups.yesterday && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        {groupedSessions.yesterday.map(item => (
                          <TimelineItem
                            key={item.id}
                            item={item}
                            onClick={handleSelectItem}
                          />
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </>
              )}

              {/* This Week group */}
              {groupedSessions.thisWeek.length > 0 && (
                <>
                  <CollapsibleGroupHeader 
                    label="This Week" 
                    count={groupedSessions.thisWeek.length}
                    isOpen={expandedGroups.thisWeek} 
                    onToggle={() => toggleGroup('thisWeek')}
                    icon={Calendar}
                  />
                  <AnimatePresence>
                    {expandedGroups.thisWeek && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        {groupedSessions.thisWeek.map(item => (
                          <TimelineItem
                            key={item.id}
                            item={item}
                            onClick={handleSelectItem}
                          />
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </>
              )}

              {/* Earlier group */}
              {groupedSessions.earlier.length > 0 && (
                <>
                  <CollapsibleGroupHeader 
                    label="Earlier" 
                    count={groupedSessions.earlier.length}
                    isOpen={expandedGroups.earlier} 
                    onToggle={() => toggleGroup('earlier')}
                    icon={Calendar}
                  />
                  <AnimatePresence>
                    {expandedGroups.earlier && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        {groupedSessions.earlier.map(item => (
                          <TimelineItem
                            key={item.id}
                            item={item}
                            onClick={handleSelectItem}
                          />
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </>
              )}

              {sessions.length === 0 && (
                <div className="p-4 text-sm text-muted-foreground">
                  No conversations yet. Start by typing a message below.
                </div>
              )}
            </SidebarMenu>
          </TabsContent>
          
          {/* Memories Tab */}
          <TabsContent value="memories" className="mt-0">
            <div className="flex justify-between items-center px-3 py-2">
              <div className="text-sm font-medium text-muted-foreground">What I Know About You</div>
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" className="h-7 px-2">
                  <BarChart3 className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="sm" className="h-7 px-2">
                  <Sparkles className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
            
            <SidebarMenu className="space-y-0 px-0">
              {/* Facts */}
              <CollapsibleGroupHeader 
                label="Personal Facts" 
                count={memories.facts.length}
                isOpen={expandedGroups.facts} 
                onToggle={() => toggleGroup('facts')}
                icon={User}
              />
              <AnimatePresence>
                {expandedGroups.facts && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="px-2"
                  >
                    {memories.facts.map(memory => (
                      <MemoryItem key={memory.id} memory={memory} />
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
              
              {/* Preferences */}
              <CollapsibleGroupHeader 
                label="Preferences" 
                count={memories.preferences.length}
                isOpen={expandedGroups.preferences} 
                onToggle={() => toggleGroup('preferences')}
                icon={Heart}
              />
              <AnimatePresence>
                {expandedGroups.preferences && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="px-2"
                  >
                    {memories.preferences.map(memory => (
                      <MemoryItem key={memory.id} memory={memory} />
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
              
              {/* Goals */}
              <CollapsibleGroupHeader 
                label="Goals & Projects" 
                count={memories.goals.length}
                isOpen={expandedGroups.goals} 
                onToggle={() => toggleGroup('goals')}
                icon={Target}
              />
              <AnimatePresence>
                {expandedGroups.goals && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="px-2"
                  >
                    {memories.goals.map(memory => (
                      <MemoryItem key={memory.id} memory={memory} />
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
              
              {/* Insights */}
              <CollapsibleGroupHeader 
                label="Insights & Patterns" 
                count={memories.insights.length}
                isOpen={expandedGroups.insights} 
                onToggle={() => toggleGroup('insights')}
                icon={Lightbulb}
              />
              <AnimatePresence>
                {expandedGroups.insights && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="px-2"
                  >
                    {memories.insights.map(memory => (
                      <MemoryItem key={memory.id} memory={memory} />
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
              
              {/* Achievements */}
              <CollapsibleGroupHeader 
                label="Achievements" 
                count={memories.achievements.length}
                isOpen={expandedGroups.achievements} 
                onToggle={() => toggleGroup('achievements')}
                icon={Star}
              />
              <AnimatePresence>
                {expandedGroups.achievements && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="px-2"
                  >
                    {memories.achievements.map(memory => (
                      <MemoryItem key={memory.id} memory={memory} />
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
              
              {/* Relationships */}
              <CollapsibleGroupHeader 
                label="Relationships" 
                count={memories.relationships.length}
                isOpen={expandedGroups.relationships} 
                onToggle={() => toggleGroup('relationships')}
                icon={User}
              />
              <AnimatePresence>
                {expandedGroups.relationships && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="px-2"
                  >
                    {memories.relationships.map(memory => (
                      <MemoryItem key={memory.id} memory={memory} />
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </SidebarMenu>
          </TabsContent>
        </Tabs>
      </SidebarContent>
      
      <SidebarFooter>
        <SignedIn>
          <TextVoiceSwitch isVoiceMode={isVoiceMode} onModeChange={setVoiceMode} />
          <NavUser />
        </SignedIn>
        <SignedOut>
          <SignInButton 
            mode="modal"
            fallbackRedirectUrl="/"
            signUpFallbackRedirectUrl="/"
          >
            <Button variant="default" className="w-full justify-start rounded-lg gap-2 p-4 h-14 font-normal">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border">
                <LogIn className="size-4" />  
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-medium">Sign In</p>
                <p className="text-xs text-muted-foreground">to start chatting</p>
              </div>
            </Button>
          </SignInButton>
        </SignedOut>
      </SidebarFooter>
    </Sidebar>
  );
};

export default EnhancedSidebar;