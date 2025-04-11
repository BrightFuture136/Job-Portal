// AdvancedFilters.tsx
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Filter, Save, RotateCcw } from "lucide-react";
import { useState, useCallback, useEffect } from "react";

export type FilterValues = {
  keyword: string;
  location: string;
  type: string | null;
  experienceLevel: string | null;
  salaryMin: number;
  salaryMax: number;
  remote: boolean;
};

interface AdvancedFiltersProps {
  filters: FilterValues;
  onChange: (filters: FilterValues) => void;
  onSaveSearch: (name: string) => void;
}

const defaultFilters: FilterValues = {
  keyword: "",
  location: "",
  type: null,
  experienceLevel: null,
  salaryMin: 0,
  salaryMax: 200000,
  remote: false,
};

export function AdvancedFilters({
  filters,
  onChange,
  onSaveSearch,
}: AdvancedFiltersProps) {
  const [isNaming, setIsNaming] = useState(false);
  const [searchName, setSearchName] = useState("");
  const [localFilters, setLocalFilters] = useState(filters);

  useEffect(() => {
    setLocalFilters(filters);
  }, [filters]);

  const handleFilterChange = useCallback(
    (newFilters: Partial<FilterValues>) => {
      const updatedFilters = { ...localFilters, ...newFilters };
      setLocalFilters(updatedFilters);
      const timer = setTimeout(() => onChange(updatedFilters), 100);
      return () => clearTimeout(timer);
    },
    [localFilters, onChange]
  );

  const handleResetFilters = useCallback(() => {
    setLocalFilters(defaultFilters);
    onChange(defaultFilters);
  }, [onChange]);

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm">
          <Filter className="h-4 w-4 mr-2" />
          Advanced Filters
        </Button>
      </SheetTrigger>
      <SheetContent className="w-[400px] sm:w-[540px]">
        <SheetHeader>
          <SheetTitle>Advanced Search</SheetTitle>
          <SheetDescription>
            Refine your job search with advanced filters
          </SheetDescription>
        </SheetHeader>

        <div className="max-h-[calc(100vh-150px)] overflow-y-auto py-4 space-y-6">
          <div className="space-y-2">
            <Label>Keywords</Label>
            <Input
              placeholder="Job title, skills, or company"
              value={localFilters.keyword ?? ""}
              onChange={(e) => handleFilterChange({ keyword: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label>Location</Label>
            <Input
              placeholder="City, state, or remote"
              value={localFilters.location ?? ""}
              onChange={(e) => handleFilterChange({ location: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label>Job Type</Label>
            <select
              value={localFilters.type ?? "all"}
              onChange={(e) =>
                handleFilterChange({
                  type: e.target.value === "all" ? null : e.target.value,
                })
              }
              className="w-full border rounded p-2 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="all">All Types</option>
              <option value="full-time">Full-time</option>
              <option value="part-time">Part-time</option>
              <option value="contract">Contract</option>
              <option value="internship">Internship</option>
            </select>
          </div>

          <div className="space-y-2">
            <Label>Experience Level</Label>
            <select
              value={localFilters.experienceLevel ?? "all"}
              onChange={(e) =>
                handleFilterChange({
                  experienceLevel:
                    e.target.value === "all" ? null : e.target.value,
                })
              }
              className="w-full border rounded p-2 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="all">Any Level</option>
              <option value="entry">Entry Level</option>
              <option value="mid">Mid Level</option>
              <option value="senior">Senior Level</option>
              <option value="executive">Executive</option>
            </select>
          </div>

          <div className="space-y-2">
            <Label>Salary Range (Annual)</Label>
            <div className="pt-2">
              <Slider
                value={[
                  localFilters.salaryMin ?? 0,
                  localFilters.salaryMax ?? 200000,
                ]}
                max={200000}
                step={5000}
                onValueChange={([min, max]) =>
                  handleFilterChange({ salaryMin: min, salaryMax: max })
                }
              />
              <div className="flex justify-between text-sm text-muted-foreground mt-2">
                <span>${(localFilters.salaryMin ?? 0).toLocaleString()}</span>
                <span>
                  ${(localFilters.salaryMax ?? 200000).toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <Label>Remote Only</Label>
            <Switch
              checked={localFilters.remote ?? false}
              onCheckedChange={(checked) =>
                handleFilterChange({ remote: checked })
              }
            />
          </div>

          <div className="space-y-4 pt-2">
            <Button
              variant="outline"
              className="w-full"
              onClick={handleResetFilters}
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset Filters
            </Button>

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
  );
}
