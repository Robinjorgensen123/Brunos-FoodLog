import {
  useEffect,
  useState,
  type ChangeEvent,
  type ReactNode,
  type SubmitEvent,
} from "react";
import { supabase } from "../../lib/supabase";
import "./dogProfile.css";

interface Dog {
  id: string;
  name: string;
  birth_date: string;
  photo_path: string | null;
}

interface DogProfileProps {
  children: ReactNode;
}

const allowedImageTypes = ["image/jpeg", "image/png", "image/webp"];
const maxImageSize = 5 * 1024 * 1024;
const bucketName = "dog-photos";

export const DogProfile = ({ children }: DogProfileProps) => {
  const [dog, setDog] = useState<Dog | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [photoResult, setPhotoResult] = useState<{
    path: string;
    url: string | null;
    error: string | null;
  } | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadDog = async () => {
      setIsLoading(true);
      setLoadError(null);

      try {
        const { data, error } = await supabase
          .from("dogs")
          .select("id, name, birth_date, photo_path")
          .maybeSingle();

        if (error) {
          throw new Error(error.message);
        }

        if (isMounted) {
          setDog(data);
        }
      } catch (error: unknown) {
        if (isMounted) {
          setLoadError(
            error instanceof Error
              ? error.message
              : "Kunde inte läsa hundprofilen.",
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void loadDog();

    return () => {
      isMounted = false;
    };
  }, [retryCount]);

  const photoPath = dog?.photo_path ?? null;

  useEffect(() => {
    if (!photoPath) return;
    let isMounted = true;

    const loadPhoto = async () => {
      try {
        const { data, error } = await supabase.storage
          .from(bucketName)
          .createSignedUrl(photoPath, 60 * 60);

        if (error) {
          throw new Error(error.message);
        }

        if (isMounted) {
          setPhotoResult({
            path: photoPath,
            url: data.signedUrl,
            error: null,
          });
        }
      } catch (error: unknown) {
        if (isMounted) {
          setPhotoResult({
            path: photoPath,
            url: null,
            error:
              error instanceof Error
                ? error.message
                : "Kunde inte läsa hundens bild.",
          });
        }
      }
    };

    void loadPhoto();

    return () => {
      isMounted = false;
    };
  }, [photoPath]);

  if (isLoading) {
    return <p>Hämtar hundprofil...</p>;
  }

  if (loadError) {
    return (
      <section className="dog-message">
        <p role="alert">Kunde inte hämta hundprofilen: {loadError}</p>
        <button type="button" onClick={() => setRetryCount((count) => count + 1)}>
          Försök igen
        </button>
      </section>
    );
  }

  if (!dog) {
    return <DogRegistration onRegistered={setDog} />;
  }

  const currentPhotoResult =
    photoResult?.path === dog.photo_path ? photoResult : null;

  return (
    <>
      <section className="dog-profile-card" aria-label="Hundprofil">
        {currentPhotoResult?.url ? (
          <img
            className="dog-profile-photo"
            src={currentPhotoResult.url}
            alt={dog.name}
          />
        ) : (
          <div className="dog-profile-photo dog-profile-photo-placeholder">
            {currentPhotoResult?.error ? "Bilden kunde inte laddas" : "Ingen bild"}
          </div>
        )}
        <div>
          <h1>{dog.name}</h1>
          <p>Född {formatBirthDate(dog.birth_date)}</p>
          {currentPhotoResult?.error && (
            <p role="alert">{currentPhotoResult.error}</p>
          )}
        </div>
      </section>
      {children}
    </>
  );
};

interface DogRegistrationProps {
  onRegistered: (dog: Dog) => void;
}

const DogRegistration = ({ onRegistered }: DogRegistrationProps) => {
  const [name, setName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const now = new Date();
  const maxBirthDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

  useEffect(
    () => () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    },
    [previewUrl],
  );

  const handleSubmit = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);

    const trimmedName = name.trim();
    if (!trimmedName) {
      setErrorMessage("Skriv hundens namn.");
      return;
    }

    if (!birthDate || birthDate > maxBirthDate) {
      setErrorMessage("Ange ett giltigt födelsedatum som inte ligger i framtiden.");
      return;
    }

    if (photo && !allowedImageTypes.includes(photo.type)) {
      setErrorMessage("Bilden måste vara JPG, PNG eller WebP.");
      return;
    }

    if (photo && photo.size > maxImageSize) {
      setErrorMessage("Bilden får vara högst 5 MB.");
      return;
    }

    setIsSubmitting(true);
    let uploadedPhotoPath: string | null = null;

    try {
      if (photo) {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError) {
          throw new Error(userError.message);
        }

        if (!user) {
          throw new Error("Du måste vara inloggad för att registrera en hund.");
        }

        const extensionByType: Record<string, string> = {
          "image/jpeg": "jpg",
          "image/png": "png",
          "image/webp": "webp",
        };
        uploadedPhotoPath = `${user.id}/${crypto.randomUUID()}.${extensionByType[photo.type]}`;

        const { error: uploadError } = await supabase.storage
          .from(bucketName)
          .upload(uploadedPhotoPath, photo, {
            cacheControl: "3600",
            contentType: photo.type,
            upsert: false,
          });

        if (uploadError) {
          throw new Error(uploadError.message);
        }
      }

      const { data, error } = await supabase
        .from("dogs")
        .insert({
          name: trimmedName,
          birth_date: birthDate,
          photo_path: uploadedPhotoPath,
        })
        .select("id, name, birth_date, photo_path")
        .single();

      if (error) {
        let message = error.message;

        if (uploadedPhotoPath) {
          const { error: cleanupError } = await supabase.storage
            .from(bucketName)
            .remove([uploadedPhotoPath]);

          if (cleanupError) {
            message += ` Bilden kunde inte städas bort: ${cleanupError.message}`;
          }
        }

        setErrorMessage(message);
        return;
      }

      onRegistered(data);
    } catch (error: unknown) {
      let message =
        error instanceof Error
          ? error.message
          : "Kunde inte registrera hunden.";

      if (uploadedPhotoPath) {
        try {
          const { error: cleanupError } = await supabase.storage
            .from(bucketName)
            .remove([uploadedPhotoPath]);

          if (cleanupError) {
            message += ` Bilden kunde inte städas bort: ${cleanupError.message}`;
          }
        } catch (cleanupError: unknown) {
          message += ` Bilden kunde inte städas bort: ${
            cleanupError instanceof Error
              ? cleanupError.message
              : "okänt fel"
          }`;
        }
      }

      setErrorMessage(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePhotoChange = (event: ChangeEvent<HTMLInputElement>) => {
    const selectedPhoto = event.target.files?.[0] ?? null;
    setPhoto(selectedPhoto);
    setPreviewUrl(
      selectedPhoto ? URL.createObjectURL(selectedPhoto) : null,
    );
  };

  return (
    <section className="dog-registration-page">
      <form className="dog-registration-card" onSubmit={handleSubmit}>
        <p className="dog-registration-eyebrow">Brunos matlogg</p>
        <h1>Registrera din hund</h1>
        <p>Fyll i uppgifterna för att komma igång.</p>

        <label htmlFor="dog-name">Hundens namn</label>
        <input
          id="dog-name"
          name="name"
          type="text"
          autoComplete="off"
          maxLength={100}
          required
          value={name}
          onChange={(event) => setName(event.target.value)}
        />

        <label htmlFor="dog-birth-date">Födelsedatum</label>
        <input
          id="dog-birth-date"
          name="birthDate"
          type="date"
          max={maxBirthDate}
          required
          value={birthDate}
          onChange={(event) => setBirthDate(event.target.value)}
        />

        <label htmlFor="dog-photo">Bild (valfritt, max 5 MB)</label>
        <input
          id="dog-photo"
          name="photo"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handlePhotoChange}
        />
        {previewUrl && (
          <img className="dog-photo-preview" src={previewUrl} alt="Förhandsvisning" />
        )}

        {errorMessage && (
          <p className="dog-registration-error" role="alert">
            {errorMessage}
          </p>
        )}

        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Sparar..." : "Spara hundprofil"}
        </button>
      </form>
    </section>
  );
};

const formatBirthDate = (birthDate: string) =>
  new Date(`${birthDate}T00:00:00`).toLocaleDateString("sv-SE", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
