import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const path = location.pathname;
    
    // Detectar URL com query string encodada incorretamente (%3F = ?, %3D = =)
    if (path.includes('%3F') || path.includes('%3D')) {
      try {
        const decodedPath = decodeURIComponent(path);
        // Separar pathname de query string
        const queryIndex = decodedPath.indexOf('?');
        
        if (queryIndex !== -1) {
          const cleanPath = decodedPath.substring(0, queryIndex);
          const queryString = decodedPath.substring(queryIndex + 1);
          
          // Redirecionar para URL correta
          navigate(`${cleanPath}?${queryString}`, { replace: true });
          return;
        }
      } catch {
        // Fallback para comportamento normal se falhar decode
      }
    }
    
    console.error(
      "404 Error: User attempted to access non-existent route:",
      path
    );
  }, [location.pathname, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4 text-foreground">404</h1>
        <p className="text-xl text-muted-foreground mb-4">Oops! Page not found</p>
        <a href="/" className="text-primary hover:text-primary/80 underline">
          Return to Home
        </a>
      </div>
    </div>
  );
};

export default NotFound;
