import { Navigation } from "@/components/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Stars, Building2, DollarSign, Users, Search } from "lucide-react";
import { Label } from "@/components/ui/label";

export default function Companies() {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Company Reviews</h1>
          <div className="w-1/3">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search companies..."
                className="pl-9"
              />
            </div>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader className="space-y-1">
              <div className="flex items-center justify-between">
                <CardTitle className="text-2xl">Tech Corp</CardTitle>
                <div className="flex items-center">
                  <Stars className="h-5 w-5 text-yellow-400" />
                  <span className="ml-1">4.5</span>
                </div>
              </div>
              <div className="flex items-center text-sm text-muted-foreground">
                <Building2 className="h-4 w-4 mr-1" />
                <span>Software Development</span>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-sm">Average Salary</Label>
                  <div className="flex items-center">
                    <DollarSign className="h-4 w-4 mr-1" />
                    <span>120k - 180k</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-sm">Company Size</Label>
                  <div className="flex items-center">
                    <Users className="h-4 w-4 mr-1" />
                    <span>1000+ employees</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm">Recent Reviews</Label>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center mb-2">
                      <Stars className="h-4 w-4 text-yellow-400" />
                      <span className="ml-1 text-sm">4.8</span>
                      <span className="mx-2 text-muted-foreground">•</span>
                      <span className="text-sm text-muted-foreground">Software Engineer</span>
                    </div>
                    <p className="text-sm">Great work culture and amazing benefits!</p>
                  </CardContent>
                </Card>
              </div>

              <Button className="w-full">View Company Profile</Button>
            </CardContent>
          </Card>

          {/* More company cards */}
        </div>
      </main>
    </div>
  );
}
