import { Navigation } from "@/components/navigation";
import { useQuery } from "@tanstack/react-query";
import { Job } from "@shared/schema";
import { JobCard } from "@/components/job-card";
import { Input } from "@/components/ui/input";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Search, Bookmark, X } from "lucide-react";
import { AdvancedFilters, type FilterValues } from "@/components/advanced-filters";
import { useToast } from "@/hooks/use-toast";

// Default filter values
const defaultFilters: FilterValues = {
  keyword: "",
  location: "",
  type: null,
  experienceLevel: null,
  salaryMin: 0,
  salaryMax: 200000,
  remote: false,
};

// Type for saved search
interface SavedSearch {
  id: string;
  name: string;
  filters: FilterValues;
}

export default function Jobs() {
  const { data: jobs, isLoading } = useQuery<Job[]>({ 
    queryKey: ["/api/jobs"] 
  });

  const { toast } = useToast();
  const [filters, setFilters] = useState<FilterValues>(defaultFilters);
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);

  // Load saved searches from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('savedJobSearches');
    if (saved) {
      setSavedSearches(JSON.parse(saved));
    }
  }, []);

  // Save searches to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('savedJobSearches', JSON.stringify(savedSearches));
  }, [savedSearches]);

  // Handle saving a new search
  const handleSaveSearch = (name: string) => {
    const newSearch: SavedSearch = {
      id: Date.now().toString(),
      name,
      filters: { ...filters },
    };
    setSavedSearches([...savedSearches, newSearch]);
    toast({
      title: "Search Saved",
      description: `Your search "${name}" has been saved.`,
    });
  };

  // Handle loading a saved search
  const handleLoadSearch = (search: SavedSearch) => {
    setFilters(search.filters);
    toast({
      title: "Search Loaded",
      description: `Loaded saved search "${search.name}".`,
    });
  };

  // Handle deleting a saved search
  const handleDeleteSearch = (searchId: string) => {
    setSavedSearches(savedSearches.filter(search => search.id !== searchId));
    toast({
      title: "Search Deleted",
      description: "Your saved search has been removed.",
    });
  };

  // Filter jobs based on all criteria
  const filteredJobs = jobs?.filter(job => {
    const matchesKeyword = 
      !filters.keyword ||
      job.title.toLowerCase().includes(filters.keyword.toLowerCase()) ||
      job.company.toLowerCase().includes(filters.keyword.toLowerCase()) ||
      job.description.toLowerCase().includes(filters.keyword.toLowerCase());

    const matchesLocation = 
      !filters.location ||
      job.location.toLowerCase().includes(filters.location.toLowerCase());

    const matchesType = !filters.type || job.type === filters.type;

    const matchesExperience = 
      !filters.experienceLevel || 
      job.experienceLevel === filters.experienceLevel;

    const matchesSalary = 
      typeof job.salary === 'number' &&
      job.salary >= filters.salaryMin && 
      job.salary <= filters.salaryMax;

    const matchesRemote = 
      !filters.remote || 
      job.remote === true;

    return (
      matchesKeyword &&
      matchesLocation &&
      matchesType &&
      matchesExperience &&
      matchesSalary &&
      matchesRemote
    );
  });

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8 space-y-6">
          <h1 className="text-3xl font-bold">Browse Jobs</h1>

          <div className="flex flex-col gap-4">
            <div className="flex gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by title, company, or skills..."
                    value={filters.keyword}
                    onChange={(e) => setFilters({ ...filters, keyword: e.target.value })}
                    className="pl-9"
                  />
                </div>
              </div>
              <AdvancedFilters
                filters={filters}
                onChange={setFilters}
                onSaveSearch={handleSaveSearch}
              />
            </div>

            {savedSearches.length > 0 && (
              <div className="flex flex-wrap gap-2">
                <span className="text-sm text-muted-foreground py-2">
                  <Bookmark className="h-4 w-4 inline mr-1" />
                  Saved Searches:
                </span>
                {savedSearches.map((search) => (
                  <Button
                    key={search.id}
                    variant="outline"
                    size="sm"
                    className="h-8"
                    onClick={() => handleLoadSearch(search)}
                  >
                    {search.name}
                    <X
                      className="h-3 w-3 ml-2 hover:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteSearch(search.id);
                      }}
                    />
                  </Button>
                ))}
              </div>
            )}
          </div>
        </div>

        {isLoading ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <div key={n} className="h-48 bg-muted rounded animate-pulse"></div>
            ))}
          </div>
        ) : filteredJobs && filteredJobs.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredJobs.map((job) => (
              <JobCard key={job.id} job={job} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            No jobs found matching your criteria.
          </div>
        )}
      </main>
    </div>
  );
}