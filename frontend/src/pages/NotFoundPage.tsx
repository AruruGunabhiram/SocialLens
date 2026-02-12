import { Link } from 'react-router-dom'

function NotFoundPage() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-center">
      <h1 className="text-3xl font-semibold">Page not found</h1>
      <p className="text-muted-foreground">The page you are looking for does not exist.</p>
      <Link className="text-primary underline underline-offset-4" to="/">
        Go back home
      </Link>
    </div>
  )
}

export default NotFoundPage
