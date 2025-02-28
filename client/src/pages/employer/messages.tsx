import { Navigation } from "@/components/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { 
  Search,
  Send,
  Paperclip,
  PhoneCall,
  Video,
  Calendar
} from "lucide-react";

export default function Messages() {
  return (
    <div className="min-h-screen bg-background bg-gray-50">
      <Navigation />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-12 gap-6 h-[calc(100vh-12rem)]">
          {/* Contacts List */}
          <div className="col-span-4 flex flex-col">
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search conversations..."
                  className="pl-9"
                />
              </div>
            </div>

            <Card className="flex-1 overflow-auto">
              <CardContent className="p-0">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    className="w-full p-4 flex items-start gap-3 hover:bg-accent text-left border-b last:border-0"
                  >
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      JD
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-baseline">
                        <p className="font-medium truncate">John Doe</p>
                        <span className="text-xs text-muted-foreground">2m ago</span>
                      </div>
                      <p className="text-sm text-muted-foreground truncate">
                        Thanks for considering my application...
                      </p>
                    </div>
                  </button>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Chat Area */}
          <div className="col-span-8">
            <Card className="h-full flex flex-col">
              <div className="p-4 border-b flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    JD
                  </div>
                  <div>
                    <p className="font-medium">John Doe</p>
                    <p className="text-sm text-muted-foreground">Frontend Developer Applicant</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon">
                    <PhoneCall className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon">
                    <Video className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon">
                    <Calendar className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="flex-1 overflow-auto p-4 space-y-4">
                {/* Messages would go here */}
                <div className="text-center text-sm text-muted-foreground py-8">
                  Start of conversation
                </div>
              </div>

              <div className="p-4 border-t">
                <div className="flex gap-2">
                  <Button variant="ghost" size="icon">
                    <Paperclip className="h-4 w-4" />
                  </Button>
                  <Input placeholder="Type a message..." />
                  <Button size="icon">
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
