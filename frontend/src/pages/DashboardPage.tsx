import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

function DashboardPage() {
  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Quick links to primary surfaces.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Channels</CardTitle>
          <CardDescription>Jump into the live channel overview.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <Link to="/channel">
              Open Channels
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

export default DashboardPage
