// src/pages/Settings.tsx
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
import { useUser, RedirectToSignIn, useAuth } from "@clerk/clerk-react";
import { useTitleGeneration } from "@/db/session-store-extension";
import { useSessionContext } from "@/db/SessionContext";
import { useState, useRef } from "react";
import { Textarea } from "@/components/ui/textarea";

// Import React FilePond
import { FilePond } from "react-filepond";
import type { FilePondFile } from "filepond";

// Import FilePond styles
import "filepond/dist/filepond.min.css";

// Define type for import status
interface ImportStatus {
    type: 'success' | 'error' | 'info' | null;
    message: string;
}

export default function SettingsPage() {
    const { user, isLoaded, isSignedIn } = useUser();
    const { getToken } = useAuth();
    const { batchGenerateTitles } = useTitleGeneration();
    const { isVoiceMode } = useSessionContext();
    const [files, setFiles] = useState<File[]>([]);
    const [exportFilename, setExportFilename] = useState("sessions-backup.json");
    const [importStatus, setImportStatus] = useState<ImportStatus | null>(null);
    const filepond = useRef<FilePond | null>(null);
    const [jsonText, setJsonText] = useState('');

    console.log('[SettingsPage] Auth state:', { isLoaded, isSignedIn, userId: user?.id });

    if (!isLoaded) {
        return <div>Loading...</div>;
    }

    if (!isSignedIn || !user) {
        console.log('[SettingsPage] Not signed in, redirecting...');
        return <RedirectToSignIn />;
    }

    // Use the same initials logic
    const initials = user.firstName && user.lastName
        ? `${user.firstName[0]}${user.lastName[0]}`
        : user.emailAddresses[0]?.emailAddress?.[0]?.toUpperCase() || '?';

    return (
        <div className="min-h-screen bg-background">
            <div className="container mx-auto p-6">
                <div className="flex items-center justify-between mb-8">
                    <Link to="/session" className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-primary">
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
                        {/* Avatar Card */}
                        <Card>
                            <CardContent className="pt-6">
                                {/* Avatar and user details */}
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

                        {/* Other left column cards */}
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
                        {/* Premium card */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Upgrade to Premium</CardTitle>
                                <CardDescription>Enhanced therapeutic support and features</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {/* Premium content */}
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

                        {/* Session History Card - UPDATED WITH FILEPOND */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Session History</CardTitle>
                                <CardDescription>Export or import your therapy sessions. Your privacy is our priority.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex flex-col space-y-2">
                                    <Label>Import from backup</Label>
                                    <div className="space-y-4">
                                        
                                        {/* FilePond Component */}
                                        <FilePond
                                            ref={filepond}
                                            files={files}
                                            onupdatefiles={(fileItems: FilePondFile[]) => {
                                                setFiles(fileItems.map(fileItem => fileItem.file as File));
                                            }}
                                            allowMultiple={false}
                                            maxFiles={1}
                                            name="file"
                                            acceptedFileTypes={['.json', 'application/json']}
                                            labelIdle='Drag & Drop your JSON backup or <span class="filepond--label-action">Browse</span>'
                                            server={{
                                                process: (
                                                    fieldName: string,
                                                    file: Blob,
                                                    metadata: any,
                                                    load: (responseText: string) => void,
                                                    error: (errorText: string) => void,
                                                    progress: (computable: boolean, loaded: number, total: number) => void,
                                                    abort: () => void
                                                ) => {
                                                    // Create an AbortController for cancellation
                                                    const abortController = new AbortController();
                                                    
                                                    const formData = new FormData();
                                                    formData.append(fieldName, file, (file as any).name);

                                                    fetch('http://localhost:3001/api/chat/normalize', {
                                                        method: 'POST',
                                                        headers: {
                                                            'x-user-id': user.id,
                                                            'Authorization': `Bearer ${user.id}`,
                                                        },
                                                        body: formData,
                                                        signal: abortController.signal
                                                    })
                                                    .then((res) => res.text())
                                                    .then((responseText) => {
                                                        console.log('Custom process response:', responseText);
                                                        try {
                                                            const result = JSON.parse(responseText);
                                                            if (result.success) {
                                                                load(responseText);
                                                                setImportStatus({
                                                                    type: 'success',
                                                                    message: result.message || 'Import successful'
                                                                });
                                                            } else {
                                                                error(result.message || 'Import failed');
                                                                setImportStatus({
                                                                    type: 'error',
                                                                    message: result.message || 'Import failed'
                                                                });
                                                            }
                                                        } catch (e) {
                                                            error('Failed to parse server response');
                                                            setImportStatus({
                                                                type: 'error',
                                                                message: 'Failed to parse server response'
                                                            });
                                                        }
                                                    })
                                                    .catch((err) => {
                                                        console.error('Custom process error:', err);
                                                        error('Upload failed');
                                                        setImportStatus({
                                                            type: 'error',
                                                            message: `Upload failed: ${err.message}`
                                                        });
                                                    });

                                                    // Return abort handler
                                                    return {
                                                        abort: () => {
                                                            abortController.abort();
                                                            setImportStatus({
                                                                type: 'info',
                                                                message: 'Upload cancelled'
                                                            });
                                                        }
                                                    };
                                                }
                                            }}
                                        />

                                        {/* Fallback Manual Upload */}
                                        <div className="mt-4">
                                            <Label className="mb-2 block">Alternative Manual Upload</Label>
                                            <div className="flex space-x-2">
                                                <Input
                                                    type="file"
                                                    accept=".json,application/json"
                                                    className="flex-1"
                                                    onChange={(e) => {
                                                        if (e.target.files && e.target.files.length > 0) {
                                                            const selectedFile = e.target.files[0];
                                                            setFiles([selectedFile as File]);
                                                        }
                                                    }}
                                                />
                                                <Button
                                                    variant="secondary"
                                                    onClick={async () => {
                                                        try {
                                                            // Validate JSON before sending
                                                            let jsonData;
                                                            try {
                                                                jsonData = JSON.parse(jsonText);
                                                                if (!Array.isArray(jsonData)) {
                                                                    throw new Error('JSON data must be an array of sessions');
                                                                }
                                                            } catch (parseError) {
                                                                setImportStatus({
                                                                    type: 'error',
                                                                    message: `Invalid JSON: ${(parseError as Error).message}`
                                                                });
                                                                return;
                                                            }

                                                            setImportStatus({
                                                                type: 'info',
                                                                message: 'Processing import...'
                                                            });

                                                            // Log what we're sending
                                                            console.log('Sending data to direct-import:', jsonData);

                                                            const token = await getToken();
                                                            const response = await fetch('http://localhost:3001/api/chat/normalize', {
                                                                method: 'POST',
                                                                headers: {
                                                                    'Content-Type': 'application/json',
                                                                    'x-user-id': user.id,
                                                                    'Authorization': `Bearer ${token || user.id}`
                                                                },
                                                                body: jsonText
                                                            });

                                                            console.log('Response status:', response.status);

                                                            // Get response as text first to inspect it
                                                            const rawResponse = await response.text();
                                                            console.log('Raw response:', rawResponse);

                                                            let result;
                                                            try {
                                                                result = JSON.parse(rawResponse);
                                                            } catch (e) {
                                                                // If response isn't JSON, use the raw text
                                                                console.error('Failed to parse response as JSON:', e);
                                                                if (response.ok) {
                                                                    setImportStatus({
                                                                        type: 'success',
                                                                        message: `Import successful, but received non-JSON response`
                                                                    });
                                                                } else {
                                                                    throw new Error(`Server error (status ${response.status}): ${rawResponse}`);
                                                                }
                                                                return;
                                                            }

                                                            // Handle the parsed response
                                                            if (response.ok) {
                                                                setImportStatus({
                                                                    type: 'success',
                                                                    message: result.message || 'Import successful'
                                                                });
                                                            } else {
                                                                throw new Error(result.message || `Server error (status ${response.status})`);
                                                            }
                                                        } catch (error) {
                                                            console.error('Text import error:', error);
                                                            setImportStatus({
                                                                type: 'error',
                                                                message: `Import failed: ${(error as Error).message}`
                                                            });
                                                        }
                                                    }}
                                                >
                                                    <Upload className="mr-2 h-4 w-4" />
                                                    Upload
                                                </Button>
                                            </div>
                                        </div>

                                        {/* Direct JSON Import */}
                                        <div className="mt-4">
                                            <Label className="mb-2 block">Direct JSON Import</Label>
                                            <Button
                                                variant="secondary"
                                                className="w-full"
                                                onClick={async () => {
                                                    if (!files || files.length === 0) {
                                                        setImportStatus({
                                                            type: 'error',
                                                            message: 'Please select a file first'
                                                        });
                                                        return;
                                                    }

                                                    try {
                                                        const file = files[0];
                                                        const fileContent = await file.text();
                                                        let jsonData;

                                                        try {
                                                            jsonData = JSON.parse(fileContent);
                                                        } catch (parseError) {
                                                            throw new Error('Invalid JSON format in file');
                                                        }

                                                        // Send the parsed JSON directly to our API
                                                        const response = await fetch('http://localhost:3001/api/chat/normalize', {
                                                            method: 'POST',
                                                            headers: {
                                                                'Content-Type': 'application/json',
                                                                'x-user-id': user.id,
                                                                'Authorization': `Bearer ${user.id}`
                                                            },
                                                            body: JSON.stringify(jsonData)
                                                        });

                                                        if (!response.ok) {
                                                            const errorText = await response.text();
                                                            throw new Error(`Import failed: ${errorText}`);
                                                        }

                                                        const result = await response.json();
                                                        setImportStatus({
                                                            type: 'success',
                                                            message: result.message || 'Import successful'
                                                        });
                                                    } catch (error) {
                                                        console.error('Direct JSON import error:', error);
                                                        setImportStatus({
                                                            type: 'error',
                                                            message: `Import failed: ${(error as Error).message}`
                                                        });
                                                    }
                                                }}
                                            >
                                                <Upload className="mr-2 h-4 w-4" />
                                                Process Selected File as JSON
                                            </Button>
                                        </div>

                                        {/* Simple JSON Import */}
                                        <div className="mt-6 p-4 border rounded-md bg-gray-50">
                                            <Label className="text-lg font-semibold">Simple JSON Import</Label>
                                            <p className="text-sm text-muted-foreground mb-4">
                                                Paste your JSON directly here to bypass file upload issues.
                                            </p>

                                            <Textarea
                                                placeholder="Paste your JSON data here..."
                                                className="min-h-[200px] mb-4 font-mono text-sm"
                                                value={jsonText}
                                                onChange={(e) => setJsonText(e.target.value)}
                                            />

                                            <Button
                                                className="w-full"
                                                onClick={async () => {
                                                    try {
                                                        // Validate JSON before sending
                                                        let jsonData;
                                                        try {
                                                            jsonData = JSON.parse(jsonText);
                                                            if (!Array.isArray(jsonData)) {
                                                                throw new Error('JSON data must be an array of sessions');
                                                            }
                                                        } catch (parseError) {
                                                            setImportStatus({
                                                                type: 'error',
                                                                message: `Invalid JSON: ${(parseError as Error).message}`
                                                            });
                                                            return;
                                                        }

                                                        setImportStatus({
                                                            type: 'info',
                                                            message: 'Processing import...'
                                                        });

                                                        const response = await fetch('http://localhost:3001/api/chat/normalize', {
                                                            method: 'POST',
                                                            headers: {
                                                                'Content-Type': 'application/json',
                                                                'x-user-id': user.id,
                                                                'Authorization': `Bearer ${user.id}`
                                                            },
                                                            body: jsonText
                                                        });

                                                        const text = await response.text();
                                                        let result;

                                                        try {
                                                            result = JSON.parse(text);
                                                        } catch (e) {
                                                            // If response isn't JSON, use the raw text
                                                            if (response.ok) {
                                                                setImportStatus({
                                                                    type: 'success',
                                                                    message: `Import successful. Server response: ${text}`
                                                                });
                                                            } else {
                                                                throw new Error(`Server error: ${text}`);
                                                            }
                                                            return;
                                                        }

                                                        setImportStatus({
                                                            type: 'success',
                                                            message: result.message || 'Import successful'
                                                        });
                                                    } catch (error) {
                                                        console.error('Text import error:', error);
                                                        setImportStatus({
                                                            type: 'error',
                                                            message: `Import failed: ${(error as Error).message}`
                                                        });
                                                    }
                                                }}
                                            >
                                                Process JSON Text
                                            </Button>
                                        </div>

                                        {/* Status alerts */}
                                        {importStatus && (
                                            <Alert className={importStatus.type === 'success' ? 'bg-green-50' : 'bg-red-50'}>
                                                <AlertTitle>{importStatus.type === 'success' ? 'Success' : 'Error'}</AlertTitle>
                                                <AlertDescription>{importStatus.message}</AlertDescription>
                                            </Alert>
                                        )}
                                    </div>
                                </div>
                                <Separator />
                                <div className="flex flex-col space-y-2">
                                    <Label>Export sessions</Label>
                                    <div className="flex space-x-2">
                                        <Input
                                            type="text"
                                            placeholder="sessions-backup.json"
                                            className="flex-1"
                                            value={exportFilename}
                                            onChange={(e) => setExportFilename(e.target.value)}
                                        />
                                        <Button variant="secondary">
                                            <Download className="mr-2 h-4 w-4" />
                                            Export
                                        </Button>
                                    </div>
                                </div>
                                <Separator />
                                <div className="flex flex-col space-y-2">
                                    <Label>Chat Titles</Label>
                                    <div className="flex space-x-2">
                                        <Button
                                            variant="secondary"
                                            className="flex-1"
                                            onClick={async () => {
                                                if (!user) return;
                                                await batchGenerateTitles(user.id, isVoiceMode);
                                            }}
                                        >
                                            <MessageSquare className="mr-2 h-4 w-4" />
                                            Generate Titles for All Chats
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Other right column cards */}
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