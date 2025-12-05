import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Mouse,
  Keyboard,
  Info,
  MapPin,
  Users,
  Settings,
  ArrowRight,
  CheckCircle,
} from "lucide-react";

interface HelpDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const HelpDialog: React.FC<HelpDialogProps> = ({
  open,
  onOpenChange,
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Info className="w-5 h-5" />
            Seat Map Editor Help
          </DialogTitle>
          <DialogDescription>
            Learn how to use the seat map editor effectively
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="shortcuts">Shortcuts</TabsTrigger>
            <TabsTrigger value="tutorial">Tutorial</TabsTrigger>
            <TabsTrigger value="tips">Tips</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold mb-2">
                  What is the Seat Map Editor?
                </h3>
                <p className="text-sm text-muted-foreground">
                  The Seat Map Editor is a powerful visual tool for creating
                  detailed venue layouts. You can design seating arrangements,
                  add decorative elements, and create interactive seat maps for
                  your events. The editor supports two main modes:
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium flex items-center gap-2 mb-2">
                    <Settings className="w-4 h-4" />
                    Shape Mode
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    Design your venue layout using shapes like rectangles,
                    ellipses, polygons, and text. Perfect for creating stage
                    areas, walkways, and decorative elements.
                  </p>
                </div>

                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium flex items-center gap-2 mb-2">
                    <Users className="w-4 h-4" />
                    Area Mode
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    Create interactive seating areas with individual seats that
                    customers can select during ticket purchasing. Configure
                    pricing and seat arrangements.
                  </p>
                </div>
              </div>

              <Separator />

              <div>
                <h4 className="font-medium mb-2">Key Features:</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    Drag and drop interface
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    Real-time collaboration
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    Undo/Redo system
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    Snap-to-grid alignment
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    Template system
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    Image upload support
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Shortcuts Tab */}
          <TabsContent value="shortcuts" className="space-y-4">
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <Keyboard className="w-5 h-5" />
                  Keyboard Shortcuts
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Tools */}
                <div>
                  <h4 className="font-medium mb-2">Tools</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>Select Tool</span>
                      <Badge variant="outline">1</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Pan Tool</span>
                      <Badge variant="outline">2</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Rectangle/Seat Grid</span>
                      <Badge variant="outline">3</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Ellipse Tool</span>
                      <Badge variant="outline">4</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Polygon Tool</span>
                      <Badge variant="outline">5</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Text Tool</span>
                      <Badge variant="outline">6</Badge>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div>
                  <h4 className="font-medium mb-2">Actions</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>Undo</span>
                      <Badge variant="outline">Ctrl+Z</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Redo</span>
                      <Badge variant="outline">Ctrl+Y</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Select All</span>
                      <Badge variant="outline">Ctrl+A</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Duplicate</span>
                      <Badge variant="outline">Ctrl+D</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Delete</span>
                      <Badge variant="outline">Del</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Clear Selection</span>
                      <Badge variant="outline">Esc</Badge>
                    </div>
                  </div>
                </div>

                {/* Navigation */}
                <div>
                  <h4 className="font-medium mb-2">Navigation</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>Pan Canvas</span>
                      <Badge variant="outline">Arrow Keys</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Zoom In</span>
                      <Badge variant="outline">Ctrl++</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Zoom Out</span>
                      <Badge variant="outline">Ctrl+-</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Reset View</span>
                      <Badge variant="outline">Ctrl+0</Badge>
                    </div>
                  </div>
                </div>

                {/* Transformations */}
                <div>
                  <h4 className="font-medium mb-2">Transformations</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>Mirror Horizontally</span>
                      <Badge variant="outline">Ctrl+Shift+H</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Mirror Vertically</span>
                      <Badge variant="outline">Ctrl+Shift+V</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>New Canvas</span>
                      <Badge variant="outline">Ctrl+N</Badge>
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              <div>
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <Mouse className="w-4 h-4" />
                  Mouse Controls
                </h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Pan Canvas</span>
                    <Badge variant="outline">Middle Click + Drag</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Zoom</span>
                    <Badge variant="outline">Mouse Wheel</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Multi-Select</span>
                    <Badge variant="outline">Ctrl + Click</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Box Select</span>
                    <Badge variant="outline">Click + Drag</Badge>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Tutorial Tab */}
          <TabsContent value="tutorial" className="space-y-4">
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <MapPin className="w-5 h-5" />
                  How to Create a Basic Seat Map
                </h3>
              </div>

              <div className="space-y-4">
                <div className="flex gap-4 p-4 border rounded-lg">
                  <div className="flex-shrink-0 w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-medium">
                    1
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium mb-1">Start with Shape Mode</h4>
                    <p className="text-sm text-muted-foreground">
                      Begin by designing your venue layout. Use rectangles for
                      stages, ellipses for circular areas, and polygons for
                      custom shapes. Add text labels to identify different
                      sections.
                    </p>
                    <div className="mt-2">
                      <Badge variant="secondary">Rectangle Tool (3)</Badge>
                      <Badge variant="secondary" className="ml-1">
                        Text Tool (6)
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="flex gap-4 p-4 border rounded-lg">
                  <div className="flex-shrink-0 w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-medium">
                    2
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium mb-1">
                      Add Background Elements
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      Create the stage area, walkways, and any fixed structures.
                      Use different colors and shapes to make your layout clear
                      and visually appealing.
                    </p>
                    <div className="mt-2">
                      <Badge variant="secondary">Upload Images</Badge>
                      <Badge variant="secondary" className="ml-1">
                        Color Picker
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="flex gap-4 p-4 border rounded-lg">
                  <div className="flex-shrink-0 w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center text-sm font-medium">
                    3
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium mb-1">Enter Area Mode</h4>
                    <p className="text-sm text-muted-foreground">
                      Click "Area Mode" to switch to seating layout mode. This
                      will automatically create a seating container where you
                      can add interactive seats.
                    </p>
                    <div className="mt-2">
                      <Badge variant="secondary">Area Mode Button</Badge>
                    </div>
                  </div>
                </div>

                <div className="flex gap-4 p-4 border rounded-lg">
                  <div className="flex-shrink-0 w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center text-sm font-medium">
                    4
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium mb-1">Create Seating Grids</h4>
                    <p className="text-sm text-muted-foreground">
                      Use the Seat Grid tool to create sections of seats. Each
                      grid represents a pricing zone (VIP, General, etc.).
                      Configure the number of rows, seats per row, and pricing.
                    </p>
                    <div className="mt-2">
                      <Badge variant="secondary">Seat Grid Tool (3)</Badge>
                      <Badge variant="secondary" className="ml-1">
                        Properties Panel
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="flex gap-4 p-4 border rounded-lg">
                  <div className="flex-shrink-0 w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center text-sm font-medium">
                    5
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium mb-1">Add Individual Seats</h4>
                    <p className="text-sm text-muted-foreground">
                      Within each grid, add rows and individual seats. You can
                      customize seat spacing, labels, and colors. Use alignment
                      tools to keep everything organized.
                    </p>
                    <div className="mt-2">
                      <Badge variant="secondary">Seat Alignment</Badge>
                      <Badge variant="secondary" className="ml-1">
                        Row Labels
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="flex gap-4 p-4 border rounded-lg">
                  <div className="flex-shrink-0 w-8 h-8 bg-purple-500 text-white rounded-full flex items-center justify-center text-sm font-medium">
                    6
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium mb-1">Test and Save</h4>
                    <p className="text-sm text-muted-foreground">
                      Exit Area Mode to see the full layout. Save your seat map
                      and test it with your event creation process. You can
                      always return to edit it later.
                    </p>
                    <div className="mt-2">
                      <Badge variant="secondary">Return Button</Badge>
                      <Badge variant="secondary" className="ml-1">
                        Save Changes
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <h4 className="font-medium text-blue-900 mb-2">
                  Quick Start Template
                </h4>
                <p className="text-sm text-blue-700">
                  For a faster start, you can upload a venue image as a
                  background, then trace over it with shapes and seating areas.
                  This ensures accurate proportions and helps visualize the
                  final result.
                </p>
              </div>
            </div>
          </TabsContent>

          {/* Tips Tab */}
          <TabsContent value="tips" className="space-y-4">
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-3">
                  Pro Tips & Best Practices
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium mb-2 text-green-600">
                    Performance Tips
                  </h4>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li>• Use Area Mode for large seating sections</li>
                    <li>• Limit decorative shapes for better performance</li>
                    <li>• Save frequently to preserve your work</li>
                    <li>• Use templates for similar venue layouts</li>
                  </ul>
                </div>

                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium mb-2 text-blue-600">
                    Design Tips
                  </h4>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li>• Use consistent colors for seat categories</li>
                    <li>• Add clear labels and section names</li>
                    <li>• Leave adequate space for walkways</li>
                    <li>• Consider accessibility requirements</li>
                  </ul>
                </div>

                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium mb-2 text-purple-600">
                    Workflow Tips
                  </h4>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li>• Start with overall layout, then add details</li>
                    <li>• Use snap-to-grid for precise alignment</li>
                    <li>• Group related elements together</li>
                    <li>• Test seat selection flow regularly</li>
                  </ul>
                </div>

                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium mb-2 text-orange-600">
                    Troubleshooting
                  </h4>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li>• Use Ctrl+Z if you make a mistake</li>
                    <li>• Clear selection with Esc if stuck</li>
                    <li>• Refresh page if editor becomes unresponsive</li>
                    <li>• Contact support for complex issues</li>
                  </ul>
                </div>
              </div>

              <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                <h4 className="font-medium text-yellow-900 mb-2">
                  ⚠️ Important Notes
                </h4>
                <ul className="text-sm text-yellow-700 space-y-1">
                  <li>• Always save your work before closing the editor</li>
                  <li>• Seat maps are automatically saved as you work</li>
                  <li>• Changes are synchronized across browser tabs</li>
                  <li>• Use consistent naming for easy management</li>
                </ul>
              </div>

              <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                <h4 className="font-medium text-green-900 mb-2">
                  ✅ Success Checklist
                </h4>
                <ul className="text-sm text-green-700 space-y-1">
                  <li>• All seating areas have clear prices</li>
                  <li>• Seat numbering is logical and sequential</li>
                  <li>• Accessibility seats are marked and accessible</li>
                  <li>• Stage/performance area is clearly indicated</li>
                  <li>• Emergency exits and walkways are visible</li>
                </ul>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
