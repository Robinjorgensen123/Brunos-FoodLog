import { useState, type SubmitEvent } from "react";
import { supabase } from "../../lib/supabase";
import "./login.css";

export const Login = () => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (isSignUp && password !== confirmPassword) {
      setErrorMessage("Lösenorden matchar inte.");
      return;
    }

    setIsSubmitting(true);

    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        });

        if (error) {
          setErrorMessage(error.message);
        } else if (!data.session) {
          setSuccessMessage(
            "Kontot är skapat. Kontrollera din e-post för att bekräfta adressen och slutföra registreringen.",
          );
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          setErrorMessage(error.message);
        }
      }
    } catch (error: unknown) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : isSignUp
            ? "Registreringen misslyckades."
            : "Inloggningen misslyckades.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleMode = () => {
    setIsSignUp((currentMode) => !currentMode);
    setConfirmPassword("");
    setErrorMessage(null);
    setSuccessMessage(null);
  };

  return (
    <section className="login-page">
      <form className="login-card" onSubmit={handleSubmit}>
        <p className="login-eyebrow">Brunos matlogg</p>
        <h1>{isSignUp ? "Skapa konto" : "Logga in"}</h1>
        <p className="login-description">
          {isSignUp
            ? "Registrera ett konto för att komma igång."
            : "Logga in för att komma åt hundens matlogg."}
        </p>

        <label htmlFor="login-email">E-post</label>
        <input
          id="login-email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />

        <label htmlFor="login-password">Lösenord</label>
        <input
          id="login-password"
          type="password"
          autoComplete={isSignUp ? "new-password" : "current-password"}
          required
          minLength={isSignUp ? 6 : undefined}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />

        {isSignUp && (
          <>
            <label htmlFor="confirm-password">Bekräfta lösenord</label>
            <input
              id="confirm-password"
              type="password"
              autoComplete="new-password"
              minLength={6}
              required
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
            />
          </>
        )}

        {errorMessage && (
          <p className="login-error" role="alert">
            {errorMessage}
          </p>
        )}
        {successMessage && (
          <p className="login-success" role="status">
            {successMessage}
          </p>
        )}

        <button type="submit" disabled={isSubmitting}>
          {isSubmitting
            ? isSignUp
              ? "Skapar konto..."
              : "Loggar in..."
            : isSignUp
              ? "Skapa konto"
              : "Logga in"}
        </button>
        <p className="login-mode-switch">
          {isSignUp ? "Har du redan ett konto?" : "Har du inget konto?"}{" "}
          <button type="button" onClick={toggleMode} disabled={isSubmitting}>
            {isSignUp ? "Logga in" : "Registrera dig"}
          </button>
        </p>
      </form>
    </section>
  );
};
