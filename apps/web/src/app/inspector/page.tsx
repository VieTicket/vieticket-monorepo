"use client"

import { IDetectedBarcode, Scanner, useDevices } from '@yudiel/react-qr-scanner';
import { decodeTicketQRData } from "@vieticket/utils/ticket-validation/client";
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
    checkInTicketAction,
    getActiveEventsAction,
    inspectTicketAction
} from '@/lib/actions/inspector/inspection-actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, ArrowLeft, Camera, CheckCircle2, Loader2, Ban, Clock } from 'lucide-react';
import { Event as PrimitiveEvent } from '@vieticket/db/pg/models/events';
import { DisplayTicket, createDisplayTicketFromQR, updateDisplayTicketFromServer } from "@vieticket/utils/ticket-validation/display-ticket";
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

type Event = Pick<PrimitiveEvent, 'id' | 'name' | 'startTime' | 'endTime' | 'location'>

// Helper function to format status for display
const formatStatus = (status: string) => {
    if (!status) return { text: 'Unknown', className: 'text-gray-500', icon: null };
    
    // Capitalize first letter
    const formattedText = status.charAt(0).toUpperCase() + status.slice(1);
    
    // Return appropriate styling and icon based on status
    switch (status.toLowerCase()) {
        case 'active':
            return { 
                text: formattedText, 
                className: 'text-green-600 font-medium', 
                icon: <CheckCircle2 className="inline-block mr-1 h-4 w-4" /> 
            };
        case 'used':
            return { 
                text: formattedText, 
                className: 'text-blue-600 font-medium', 
                icon: <Clock className="inline-block mr-1 h-4 w-4" /> 
            };
        case 'cancelled':
        case 'invalid':
            return { 
                text: formattedText, 
                className: 'text-red-600 font-medium', 
                icon: <Ban className="inline-block mr-1 h-4 w-4" /> 
            };
        case 'pending':
            return { 
                text: formattedText, 
                className: 'text-amber-600 font-medium', 
                icon: <Clock className="inline-block mr-1 h-4 w-4" /> 
            };
        default:
            return { 
                text: formattedText, 
                className: 'text-gray-600 font-medium', 
                icon: null 
            };
    }
};

export default function InspectorPage() {
    const router = useRouter();
    const [events, setEvents] = useState<Event[]>([]);
    const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [scannerActive, setScannerActive] = useState(false);
    const [ticketInfo, setTicketInfo] = useState<DisplayTicket | null>(null);
    const [inspectionResult, setInspectionResult] = useState<'valid' | 'invalid' | null>(null);
    const [isCheckInMode, setIsCheckInMode] = useState(true); // Default to check-in mode
    const [isProcessing, setIsProcessing] = useState(false); // For loading state

    // Camera selection
    const devices = useDevices();
    const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);

    // Fetch active events on component mount
    useEffect(() => {
        async function fetchEvents() {
            try {
                setLoading(true);
                const response = await getActiveEventsAction();

                if (response.success && response.data) {
                    setEvents(response.data);
                } else {
                    setError(response.error?.message || 'Failed to load events');
                }
            } catch (err) {
                setError('An unexpected error occurred');
                console.error(err);
            } finally {
                setLoading(false);
            }
        }

        fetchEvents();
    }, []);

    useEffect(() => {
        console.log(events);
    }, [events]);

    const handleEventSelect = (eventId: string) => {
        setSelectedEventId(eventId);
        setTicketInfo(null);
        setInspectionResult(null);
        setScannerActive(true);
    };

    const handleScan = async (detectedCodes: IDetectedBarcode[]): Promise<void> => {
        if (!selectedEventId || detectedCodes.length === 0 || !detectedCodes[0].rawValue) {
            return;
        }

        try {
            // Temporarily disable scanner to prevent multiple scans
            setScannerActive(false);

            const qrData = detectedCodes[0].rawValue;
            const decodedData = decodeTicketQRData(qrData);

            if (!decodedData) {
                toast.error('Invalid QR Code', { description: "The scanned QR code is not a valid ticket"});
                setInspectionResult('invalid');
                return;
            }

            // Check if the ticket is for the selected event
            if (decodedData.eventId !== selectedEventId) {
                toast.error("Wrong Event", { description: "This ticket is for a different event"});
                setInspectionResult('invalid');
                return;
            }

            // Immediately display ticket info from decoded data using our helper function
            setTicketInfo(createDisplayTicketFromQR(decodedData, 'pending'));

            // Show loading state
            setIsProcessing(true);

            // Perform action based on mode (inspect or check-in)
            if (isCheckInMode) {
                // Check-in mode: Directly check in the ticket
                const checkInResponse = await checkInTicketAction(decodedData.ticketId);

                if (checkInResponse.success && checkInResponse.data) {
                    // Update ticket info with server response using our helper function
                    setTicketInfo(prev => updateDisplayTicketFromServer(prev!, checkInResponse.data));

                    if (checkInResponse.data.status === 'active') {
                        setInspectionResult('valid');
                        toast.success("Check-in Successful", { description: "Ticket has been marked as used" });
                    } else {
                        setInspectionResult('invalid');
                        toast.error("Check-in Failed", { description: "Ticket is not active" });
                    }
                } else {
                    setInspectionResult('invalid');
                    toast.error("Check-in Failed", { description: checkInResponse.error?.message || "Failed to check in ticket" });
                }
            } else {
                // Inspect mode: Only inspect the ticket
                const inspectionResponse = await inspectTicketAction(decodedData.ticketId);

                if (inspectionResponse.success && inspectionResponse.data) {
                    // Update ticket info with server response using our helper function
                    setTicketInfo(prev => updateDisplayTicketFromServer(prev!, inspectionResponse.data));

                    if (inspectionResponse.data.status === 'active') {
                        setInspectionResult('valid');
                    } else {
                        setInspectionResult('invalid');
                    }
                } else {
                    setInspectionResult('invalid');
                    toast.error("Inspection Failed", { description: inspectionResponse.error?.message || "Failed to inspect ticket" });
                }
            }
        } catch (error) {
            console.error("Error during ticket scan:", error);
            toast.error("Scan Error", { description: "An error occurred while processing the ticket" });
            setInspectionResult('invalid');
        } finally {
            // Hide loading state
            setIsProcessing(false);
            // Re-enable scanner after processing
            setTimeout(() => setScannerActive(true), 2000);
        }
    };

    const handleScannerError = (error: unknown): void => {
        console.error("Scanner error:", error);
        toast.error("Scanner Error", { description: "There was a problem with the QR scanner" });
    };

    const handleCheckIn = async () => {
        if (!ticketInfo) return;

        try {
            const response = await checkInTicketAction(ticketInfo.ticketId);

            if (response.success) {
                // Update local ticket info using our helper function
                setTicketInfo(prev => updateDisplayTicketFromServer(prev!, response.data));
                
                if (response.data.status === 'active') {
                    setInspectionResult('valid');
                    toast.success("Check-in Successful", { description: "Ticket has been marked as used" });
                } else {
                    setInspectionResult('invalid');
                    toast.error("Check-in Failed", { description: "Ticket is not active" });
                }
            } else {
                setInspectionResult('invalid');
                toast.error("Check-in Failed", { description: response.error?.message || "Failed to check in ticket" });
            }
        } catch (error) {
            console.error("Error during check-in:", error);
            toast.error("Check-in Error", { description: "An error occurred during check-in" });
        }
    };

    const resetScan = () => {
        setTicketInfo(null);
        setInspectionResult(null);
        setIsProcessing(false);
        setScannerActive(true);
    };

    if (loading) {
        return (
            <div className="container mx-auto p-4 flex justify-center items-center min-h-screen">
                <p>Loading events...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="container mx-auto p-4">
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4"/>
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            </div>
        );
    }

    if (events.length === 0) {
        return (
            <div className="container mx-auto p-4">
                <Alert>
                    <AlertCircle className="h-4 w-4"/>
                    <AlertTitle>No Active Events</AlertTitle>
                    <AlertDescription>You don&apos;t have any active events available for inspection.</AlertDescription>
                </Alert>
            </div>
        );
    }

    return (
        <div className="container mx-auto p-4 space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold">Ticket Inspector</h1>
                <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-gray-500 hover:text-gray-700"
                    onClick={() => router.push('/organizer')}
                >
                    <ArrowLeft className="h-4 w-4 mr-1" />
                    Back to Dashboard
                </Button>
            </div>

            {!selectedEventId ? (
                <Card>
                    <CardHeader>
                        <CardTitle>Select an Event</CardTitle>
                        <CardDescription>Choose an event to start inspecting tickets</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Select onValueChange={handleEventSelect}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select an event"/>
                            </SelectTrigger>
                            <SelectContent>
                                {events.map((event) => (
                                    <SelectItem key={event.id} value={event.id}>
                                        {event.name} - {new Date(event.startTime).toLocaleDateString()}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </CardContent>
                </Card>
            ) : (
                <>
                    <div className="flex justify-between items-center">
                        <h2 className="text-xl font-semibold">
                            Inspecting: {events.find(e => e.id === selectedEventId)?.name}
                        </h2>
                        <Button variant="outline" onClick={() => setSelectedEventId(null)}>
                            Change Event
                        </Button>
                    </div>

                    {ticketInfo ? (
                        <Card>
                            <CardHeader>
                                <CardTitle>
                                    {isProcessing ? (
                                        <div className="flex items-center text-blue-600">
                                            <Loader2 className="mr-2 h-5 w-5 animate-spin"/>
                                            Processing Ticket
                                        </div>
                                    ) : inspectionResult === 'valid' ? (
                                        <div className="flex items-center text-green-600">
                                            <CheckCircle2 className="mr-2 h-5 w-5"/>
                                            Valid Ticket
                                        </div>
                                    ) : (
                                        <div className="flex items-center text-red-600">
                                            <AlertCircle className="mr-2 h-5 w-5"/>
                                            Invalid Ticket
                                        </div>
                                    )}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2">
                                <p><strong>Visitor:</strong> {ticketInfo.visitorName}</p>
                                {ticketInfo.area && <p><strong>Area:</strong> {ticketInfo.area}</p>}
                                {ticketInfo.row && <p><strong>Row:</strong> {ticketInfo.row}</p>}
                                {ticketInfo.seat && <p><strong>Seat:</strong> {ticketInfo.seat}</p>}
                                <p>
                                    <strong>Status:</strong> {isProcessing ? (
                                    <span className="inline-flex items-center">
                                            <Loader2 className="mr-1 h-3 w-3 animate-spin"/>
                                            Verifying...
                                        </span>
                                ) : (
                                    <span className={formatStatus(ticketInfo.status).className}>
                                        {formatStatus(ticketInfo.status).icon}
                                        {formatStatus(ticketInfo.status).text}
                                    </span>
                                )}
                                </p>
                            </CardContent>
                            <CardFooter className="flex justify-between">
                                <Button variant="outline" onClick={resetScan}>
                                    Scan Another
                                </Button>
                                {!isProcessing && ticketInfo.status === 'active' && !isCheckInMode && (
                                    <Button onClick={handleCheckIn}>
                                        Check In
                                    </Button>
                                )}
                            </CardFooter>
                        </Card>
                    ) : (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center space-x-2">
                                    <Switch
                                        id="mode-switch"
                                        checked={isCheckInMode}
                                        onCheckedChange={setIsCheckInMode}
                                    />
                                    <Label htmlFor="mode-switch" className="font-medium">
                                        {isCheckInMode ? "Check-in Mode" : "Inspect Mode"}
                                    </Label>
                                </div>

                                {devices && devices.length > 1 && (
                                    <div className="flex items-center space-x-2">
                                        <Camera className="h-4 w-4"/>
                                        <Select
                                            value={selectedDeviceId || ''}
                                            onValueChange={(value) => setSelectedDeviceId(value || null)}
                                        >
                                            <SelectTrigger className="w-[180px]">
                                                <SelectValue placeholder="Select camera"/>
                                            </SelectTrigger>
                                            <SelectContent>
                                                {devices.map((device) => (
                                                    <SelectItem key={device.deviceId} value={device.deviceId}>
                                                        {device.label || `Camera ${device.deviceId.slice(0, 5)}...`}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                )}
                            </div>

                            <div className="text-center mb-2">
                                <h2 className="text-xl font-semibold">Scan Ticket</h2>
                                <p className="text-gray-500">Position the QR code within the scanner</p>
                            </div>

                            {scannerActive && (
                                <div className="h-[400px] md:h-[500px] w-full max-w-3xl mx-auto rounded-lg overflow-hidden border border-gray-200">
                                    <Scanner
                                        onScan={handleScan}
                                        onError={handleScannerError}
                                        constraints={{
                                            deviceId: selectedDeviceId ? {exact: selectedDeviceId} : undefined,
                                            facingMode: !selectedDeviceId ? "environment" : undefined
                                        }}
                                        sound={true}
                                    />
                                </div>
                            )}
                        </div>
                    )}
                </>
            )}
        </div>
    );
}