import { 
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Filter, Save } from "lucide-react"
import { useState } from "react"

export type FilterValues = {
  keyword: string;
  location: string;
  type: string | null;
  experienceLevel: string | null;
  salaryMin: number;
  salaryMax: number;
  remote: boolean;
}

interface AdvancedFiltersProps {
  filters: FilterValues;
  onChange: (filters: FilterValues) => void;
  onSaveSearch: (name: string) => void;
}

export function AdvancedFilters({ filters, onChange, onSaveSearch }: AdvancedFiltersProps) {
  const [isNaming, setIsNaming] = useState(false);
  const [searchName, setSearchName] = useState("");

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm">
          <Filter className="h-4 w-4 mr-2" />
          Advanced Filters
        </Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Advanced Search</SheetTitle>
          <SheetDescription>
            Refine your job search with advanced filters
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Keywords</Label>
            <Input
              placeholder="Job title, skills, or company"
              value={filters.keyword}
              onChange={(e) => onChange({ ...filters, keyword: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label>Location</Label>
            <Input
              placeholder="City, state, or remote"
              value={filters.location}
              onChange={(e) => onChange({ ...filters, location: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label>Job Type</Label>
            <Select
              value={filters.type || "all"}
              onValueChange={(value) => onChange({ ...filters, type: value === "all" ? null : value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select job type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="full-time">Full-time</SelectItem>
                <SelectItem value="part-time">Part-time</SelectItem>
                <SelectItem value="contract">Contract</SelectItem>
                <SelectItem value="internship">Internship</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Experience Level</Label>
            <Select
              value={filters.experienceLevel || "all"}
              onValueChange={(value) => onChange({ ...filters, experienceLevel: value === "all" ? null : value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select experience level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any Level</SelectItem>
                <SelectItem value="entry">Entry Level</SelectItem>
                <SelectItem value="mid">Mid Level</SelectItem>
                <SelectItem value="senior">Senior Level</SelectItem>
                <SelectItem value="executive">Executive</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Salary Range (Annual)</Label>
            <div className="pt-2">
              <Slider
                defaultValue={[filters.salaryMin, filters.salaryMax]}
                max={200000}
                step={5000}
                onValueChange={([min, max]) => 
                  onChange({ ...filters, salaryMin: min, salaryMax: max })}
              />
              <div className="flex justify-between text-sm text-muted-foreground mt-1">
                <span>${filters.salaryMin.toLocaleString()}</span>
                <span>${filters.salaryMax.toLocaleString()}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <Label>Remote Only</Label>
            <Switch
              checked={filters.remote}
              onCheckedChange={(checked) => 
                onChange({ ...filters, remote: checked })}
            />
          </div>

          <div className="pt-4">
            {isNaming ? (
              <div className="space-y-2">
                <Input
                  placeholder="Name this search"
                  value={searchName}
                  onChange={(e) => setSearchName(e.target.value)}
                />
                <div className="flex gap-2">
                  <Button 
                    onClick={() => {
                      onSaveSearch(searchName);
                      setIsNaming(false);
                      setSearchName("");
                    }}
                    disabled={!searchName}
                  >
                    Save Search
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => {
                      setIsNaming(false);
                      setSearchName("");
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setIsNaming(true)}
              >
                <Save className="h-4 w-4 mr-2" />
                Save This Search
              </Button>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}