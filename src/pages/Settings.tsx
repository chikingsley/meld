import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { Link } from 'react-router-dom';
import { Brain, ChevronLeft, Download, HeartPulse, KeyRound, LifeBuoy, Mail, MessageSquare, Trash2, Upload } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { PlanToggle } from "@/components/ui/plan-toggle"
import { useUser } from "@clerk/clerk-react";

export default function SettingsPage() {
    const { user } = useUser();

    if (!user) {
        return null;
    }

    // Use the same initials logic
    const initials = user.firstName && user.lastName
        ? `${user.firstName[0]}${user.lastName[0]}`
        : user.emailAddresses[0]?.emailAddress?.[0]?.toUpperCase() || '?';

    return (
        <div className="min-h-screen bg-background">
            <div className="container mx-auto p-6">
                <div className="flex items-center justify-between mb-8">
                    <Link to="/" className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-primary">
                        <ChevronLeft className="mr-2 h-4 w-4" />
                        Back to Dashboard
                    </Link>
                    <Button variant="ghost" className="text-muted-foreground hover:text-primary">
                        Sign out
                    </Button>
                </div>

                <div className="grid gap-8 md:grid-cols-[1fr_2fr]">
                    {/* Left Column (1/3) */}
                    <div className="space-y-6">
                        <Card>
                            <CardContent className="pt-6">
                                <div className="flex flex-col items-center space-y-4 text-center">
                                    <Avatar className="h-32 w-32">
                                        <AvatarImage
                                            src={user.imageUrl}
                                            alt={user.fullName || ''}
                                        />
                                        <AvatarFallback>{initials}</AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <h2 className="text-2xl font-bold">{user.fullName}</h2>
                                        <p className="text-sm text-muted-foreground">{user.primaryEmailAddress?.emailAddress}</p>
                                    </div>
                                    <PlanToggle />
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Contact Us</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <Button variant="outline" className="w-full">
                                    <Mail className="mr-2 h-4 w-4" />
                                    Email Support
                                </Button>
                                <Button variant="outline" className="w-full">
                                    <HeartPulse className="mr-2 h-4 w-4" />
                                    Crisis Resources
                                </Button>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Keyboard Shortcuts</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <Label>Quick Emotional Check-in</Label>
                                    <div className="flex items-center space-x-2">
                                        <KeyRound className="h-4 w-4 text-muted-foreground" />
                                        <span className="text-sm">⌘ + E</span>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between">
                                    <Label>New Session</Label>
                                    <div className="flex items-center space-x-2">
                                        <KeyRound className="h-4 w-4 text-muted-foreground" />
                                        <span className="text-sm">⌘ + N</span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Alert>
                            <AlertTitle>Disclaimer</AlertTitle>
                            <AlertDescription>
                                Mindful Space is an AI-assisted therapy tool and should not replace professional medical advice,
                                diagnosis, or treatment. If you're experiencing a crisis or emergency, please contact your local
                                emergency services or crisis hotline immediately.
                            </AlertDescription>
                        </Alert>
                    </div>

                    {/* Right Column (2/3) */}
                    <div className="space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Upgrade to Premium</CardTitle>
                                <CardDescription>Enhanced therapeutic support and features</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="flex justify-between items-center mb-6">
                                    <div className="space-y-1">
                                        <h3 className="text-2xl font-semibold">
                                            $12<span className="text-sm font-normal">/month</span>
                                        </h3>
                                    </div>
                                    <Button>Upgrade Now</Button>
                                </div>
                                <div className="grid gap-4 md:grid-cols-3">
                                    <div className="flex flex-col items-center space-y-2 text-center">
                                        <MessageSquare className="h-8 w-8 text-primary" />
                                        <h4 className="font-medium">Extended Sessions</h4>
                                        <p className="text-sm text-muted-foreground">Longer therapy sessions with no time limits</p>
                                    </div>
                                    <div className="flex flex-col items-center space-y-2 text-center">
                                        <Brain className="h-8 w-8 text-primary" />
                                        <h4 className="font-medium">Advanced AI Models</h4>
                                        <p className="text-sm text-muted-foreground">Access to specialized therapeutic AI models</p>
                                    </div>
                                    <div className="flex flex-col items-center space-y-2 text-center">
                                        <LifeBuoy className="h-8 w-8 text-primary" />
                                        <h4 className="font-medium">Priority Support</h4>
                                        <p className="text-sm text-muted-foreground">24/7 access to human support team</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Session History</CardTitle>
                                <CardDescription>Export or import your therapy sessions. Your privacy is our priority.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex flex-col space-y-2">
                                    <Label>Import from backup</Label>
                                    <div className="flex space-x-2">
                                        <Input type="file" className="flex-1" />
                                        <Button variant="secondary">
                                            <Upload className="mr-2 h-4 w-4" />
                                            Import
                                        </Button>
                                    </div>
                                </div>
                                <Separator />
                                <div className="flex flex-col space-y-2">
                                    <Label>Export sessions</Label>
                                    <div className="flex space-x-2">
                                        <Input type="text" placeholder="sessions-backup.json" className="flex-1" />
                                        <Button variant="secondary">
                                            <Download className="mr-2 h-4 w-4" />
                                            Export
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Cloud Sync</CardTitle>
                                <CardDescription>Securely sync your therapy sessions across devices</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="space-y-0.5">
                                        <Label htmlFor="cloud-sync">Enable Cloud Sync</Label>
                                        <p className="text-sm text-muted-foreground">Your data will be encrypted and synced securely</p>
                                    </div>
                                    <Switch id="cloud-sync" />
                                </div>
                                <Separator />
                                <div className="space-y-2">
                                    <Label>Delete Synced History</Label>
                                    <p className="text-sm text-muted-foreground">
                                        Remove all synced data from our servers. This action cannot be undone.
                                    </p>
                                    <Button variant="destructive">
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        Delete Synced History
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle className="text-destructive">Delete Account and Data</CardTitle>
                                <CardDescription>Permanently remove all your data and account information</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <p className="mb-4 text-sm text-muted-foreground">
                                    This action will permanently delete your account, all session history, and personal data from our
                                    systems. This cannot be undone.
                                </p>
                                <Button variant="destructive">Delete All Data and Account</Button>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    )
}

