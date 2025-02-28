import { Navigation } from "@/components/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { 
  Upload,
  Image as ImageIcon,
  Building2,
  Users,
  Globe,
  Calendar
} from "lucide-react";

export default function Branding() {
  return (
    <div className="min-h-screen bg-background bg-gray-50">
      <Navigation />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8 space-y-4">
          <h1 className="text-3xl font-bold">Company Branding</h1>
          <p className="text-muted-foreground">
            Showcase your company culture and attract top talent.
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-3">
          <div className="md:col-span-2 space-y-8">
            <Card>
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Company Logo</Label>
                  <div className="flex items-center gap-4">
                    <div className="h-24 w-24 rounded-lg border-2 border-dashed flex items-center justify-center">
                      <ImageIcon className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <Button variant="outline">
                      <Upload className="h-4 w-4 mr-2" />
                      Upload Logo
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Company Name</Label>
                  <Input placeholder="Enter company name" />
                </div>

                <div className="space-y-2">
                  <Label>Industry</Label>
                  <Input placeholder="e.g. Technology, Healthcare, Finance" />
                </div>

                <div className="space-y-2">
                  <Label>Website</Label>
                  <Input placeholder="https://example.com" />
                </div>

                <div className="space-y-2">
                  <Label>About Company</Label>
                  <Textarea placeholder="Describe your company's mission, values, and culture" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Culture & Benefits</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Work Culture</Label>
                  <Textarea placeholder="Describe your work environment and team culture" />
                </div>

                <div className="space-y-2">
                  <Label>Benefits & Perks</Label>
                  <Textarea placeholder="List the benefits and perks you offer to employees" />
                </div>

                <div className="space-y-2">
                  <Label>Office Photos</Label>
                  <div className="grid grid-cols-3 gap-4">
                    {[1, 2, 3].map((n) => (
                      <div key={n} className="aspect-video rounded-lg border-2 border-dashed flex items-center justify-center">
                        <ImageIcon className="h-8 w-8 text-muted-foreground" />
                      </div>
                    ))}
                  </div>
                  <Button variant="outline" className="mt-2">
                    <Upload className="h-4 w-4 mr-2" />
                    Add Photos
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Company Overview</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Technology</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">1000+ employees</span>
                </div>
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Worldwide</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Founded in 2010</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Preview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="aspect-video rounded-lg border-2 border-dashed flex items-center justify-center">
                  <p className="text-sm text-muted-foreground">Company profile preview</p>
                </div>
              </CardContent>
            </Card>

            <Button className="w-full">Save Changes</Button>
          </div>
        </div>
      </main>
    </div>
  );
}
