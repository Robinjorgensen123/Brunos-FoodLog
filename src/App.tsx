import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { BrowserRouter, Navigate, Route, Routes } from "react-router";
import { Login } from "./features/auth/login";
import { DogProfile } from "./features/dog/dogProfile";
import { Entry } from "./features/entry/entry";
import { supabase } from "./lib/supabase";

export const App = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (!isMounted) return;

        if (error) {
          setAuthError(error.message);
        }

        setSession(data.session);
        setIsLoading(false);
      })
      .catch((error: unknown) => {
        if (!isMounted) return;

        setAuthError(
          error instanceof Error
            ? error.message
            : "Kunde inte kontrollera inloggningen.",
        );
        setIsLoading(false);
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setAuthError(null);
      setIsLoading(false);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return (
    <BrowserRouter>
      <main className="App">
        {authError ? (
          <p role="alert">Kunde inte kontrollera inloggningen: {authError}</p>
        ) : isLoading ? (
          <p>Kontrollerar inloggning...</p>
        ) : (
          <Routes>
            <Route
              path="/login"
              element={
                session ? <Navigate to="/" replace /> : <Login />
              }
            />
            <Route
              path="/"
              element={
                session ? (
                  <AuthenticatedHome />
                ) : (
                  <Navigate to="/login" replace />
                )
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        )}
      </main>
    </BrowserRouter>
  );
};

const AuthenticatedHome = () => {
  const [signOutError, setSignOutError] = useState<string | null>(null);
  const [isSigningOut, setIsSigningOut] = useState(false);

  const handleSignOut = async () => {
    setSignOutError(null);
    setIsSigningOut(true);

    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        setSignOutError(error.message);
      }
    } catch (error: unknown) {
      setSignOutError(
        error instanceof Error ? error.message : "Utloggningen misslyckades.",
      );
    } finally {
      setIsSigningOut(false);
    }
  };

  return (
    <div className="authenticated-page">
      <header className="authenticated-header">
        {signOutError && <p role="alert">{signOutError}</p>}
        <button
          type="button"
          onClick={handleSignOut}
          disabled={isSigningOut}
        >
          {isSigningOut ? "Loggar ut..." : "Logga ut"}
        </button>
      </header>
      <DogProfile>
        <Entry />
      </DogProfile>
    </div>
  );
};
