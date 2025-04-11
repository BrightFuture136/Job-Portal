"use client";

import { useState, useEffect } from "react";
import { Navigation } from "@/components/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Stars, Building2, DollarSign, Users, Search } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Redirect } from "wouter";
interface Company {
  id: number;
  companyName: string;
  industry: string;
  companySize: string;
  logoUrl: string | null;
  avgRating: number;
  reviewCount: number;
  recentReview: string;
  recentPosition: string;
  salaryRange: string;
}

export default function Companies() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchCompanies(searchTerm);
  }, [searchTerm]);

  const fetchCompanies = async (search: string) => {
    try {
      const response = await fetch(
        `/api/companies${search ? `?search=${encodeURIComponent(search)}` : ""}`
      );
      if (!response.ok) throw new Error("Failed to fetch companies");
      const data = await response.json();
      setCompanies(data);
    } catch (error) {
      console.error("Error fetching companies:", error);
    }
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const handleViewProfile = (companyId: number) => {
    // Redirect to the company profile page
    window.location.href = `/companies/${companyId}`;
  };

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
                value={searchTerm}
                onChange={handleSearch}
              />
            </div>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {companies.map((company) => (
            <Card key={company.id}>
              <CardHeader className="space-y-1">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-2xl">
                    {company.companyName}
                  </CardTitle>
                  <div className="flex items-center">
                    <Stars className="h-5 w-5 text-yellow-400" />
                    <span className="ml-1">{company.avgRating.toFixed(1)}</span>
                  </div>
                </div>
                <div className="flex items-center text-sm text-muted-foreground">
                  <Building2 className="h-4 w-4 mr-1" />
                  <span>{company.industry}</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-sm">Average Salary</Label>
                    <div className="flex items-center">
                      <DollarSign className="h-4 w-4 mr-1" />
                      <span>{company.salaryRange}</span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-sm">Company Size</Label>
                    <div className="flex items-center">
                      <Users className="h-4 w-4 mr-1" />
                      <span>{company.companySize}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm">Recent Review</Label>
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center mb-2">
                        <Stars className="h-4 w-4 text-yellow-400" />
                        <span className="ml-1 text-sm">
                          {company.avgRating.toFixed(1)}
                        </span>
                        <span className="mx-2 text-muted-foreground">•</span>
                        <span className="text-sm text-muted-foreground">
                          {company.recentPosition}
                        </span>
                      </div>
                      <p className="text-sm">{company.recentReview}</p>
                    </CardContent>
                  </Card>
                </div>

                <Button
                  className="w-full"
                  onClick={() => handleViewProfile(company.id)}
                >
                  View Company Profile
                </Button>
              </CardContent>
            </Card>
          ))}
          {companies.length === 0 && (
            <p className="text-center col-span-2 text-muted-foreground">
              No companies found matching your search.
            </p>
          )}
        </div>
      </main>
    </div>
  );
}
