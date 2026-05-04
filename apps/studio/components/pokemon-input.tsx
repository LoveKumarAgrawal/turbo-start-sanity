"use client";

import { SearchIcon } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { type ObjectInputProps, set, unset } from "sanity";

type PokemonSummary = {
  name: string;
  url: string;
};

type PokemonDetail = {
  id: number;
  name: string;
  sprites: {
    front_default: string | null;
    other?: {
      "official-artwork"?: { front_default: string | null };
    };
  };
};

type PokemonValue = {
  id: number;
  name: string;
  sprite: string | null;
};

const POKE_API_BASE = "https://pokeapi.co/api/v2";
const LIST_LIMIT = 151; // first-gen, expand if needed

async function fetchPokemonList(): Promise<PokemonSummary[]> {
  const res = await fetch(`${POKE_API_BASE}/pokemon?limit=${LIST_LIMIT}&offset=0`);
  const data = await res.json();
  return data.results as PokemonSummary[];
}

async function fetchPokemonDetail(nameOrId: string | number): Promise<PokemonDetail> {
  const res = await fetch(`${POKE_API_BASE}/pokemon/${nameOrId}`);
  if (!res.ok) throw new Error(`Pokemon "${nameOrId}" not found`);
  return res.json();
}

/**
 * Custom Sanity input component for selecting a Pokémon.
 *
 * Usage: set the component on a `pokemon` object field in the schema.
 *
 * Stored value shape:
 * {
 *   id: number,
 *   name: string,
 *   sprite: string | null
 * }
 */
export function PokemonInput(props: ObjectInputProps) {
  const { onChange, value } = props;

  const [search, setSearch] = useState("");
  const [allPokemon, setAllPokemon] = useState<PokemonSummary[]>([]);
  const [filtered, setFiltered] = useState<PokemonSummary[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selecting, setSelecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Load full list once
  useEffect(() => {
    fetchPokemonList()
      .then((list) => {
        setAllPokemon(list);
        setFiltered(list.slice(0, 20));
      })
      .catch(() => setError("Failed to load Pokémon list"));
  }, []);

  // Filter on search
  useEffect(() => {
    const q = search.trim().toLowerCase();
    if (!q) {
      setFiltered(allPokemon.slice(0, 20));
    } else {
      setFiltered(
        allPokemon
          .filter((p) => p.name.includes(q))
          .slice(0, 20)
      );
    }
  }, [search, allPokemon]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleSelect = useCallback(
    async (pokemon: PokemonSummary) => {
      setSelecting(true);
      setError(null);
      try {
        const detail = await fetchPokemonDetail(pokemon.name);
        const sprite =
          detail.sprites.other?.["official-artwork"]?.front_default ??
          detail.sprites.front_default;

        const newValue: PokemonValue = {
          id: detail.id,
          name: detail.name,
          sprite,
        };

        onChange([
          set(newValue.id, ["id"]),
          set(newValue.name, ["name"]),
          set(newValue.sprite ?? "", ["sprite"]),
        ]);

        setIsOpen(false);
        setSearch("");
      } catch {
        setError("Failed to load Pokémon details. Please try again.");
      } finally {
        setSelecting(false);
      }
    },
    [onChange]
  );

  const handleClear = useCallback(() => {
    onChange([unset()]);
  }, [onChange]);

  const currentValue = value as PokemonValue | undefined;

  // CSS variables from Sanity Studio's theme — work in both light and dark mode
  const styles = {
    root: {
      fontFamily: "var(--font-family-sans, sans-serif)",
    } as React.CSSProperties,
    preview: {
      display: "flex",
      alignItems: "center",
      gap: 12,
      padding: "10px 14px",
      borderRadius: 6,
      background: "var(--card-muted-bg-color, rgba(128,128,128,0.08))",
      border: "1px solid var(--card-border-color, rgba(128,128,128,0.2))",
      marginBottom: 8,
    } as React.CSSProperties,
    previewName: {
      fontWeight: 600,
      textTransform: "capitalize" as const,
      fontSize: 15,
      color: "var(--card-fg-color, inherit)",
    },
    previewId: {
      fontSize: 12,
      color: "var(--card-muted-fg-color, rgba(128,128,128,0.7))",
    },
    clearBtn: {
      marginLeft: "auto",
      background: "none",
      border: "1px solid var(--card-border-color, rgba(128,128,128,0.3))",
      borderRadius: 4,
      padding: "4px 10px",
      cursor: "pointer",
      fontSize: 12,
      color: "var(--card-fg-color, inherit)",
    } as React.CSSProperties,
    searchWrapper: {
      position: "relative" as const,
    },
    searchIcon: {
      position: "absolute" as const,
      left: 10,
      top: "50%",
      transform: "translateY(-50%)",
      color: "var(--card-muted-fg-color, rgba(128,128,128,0.6))",
      pointerEvents: "none" as const,
    },
    searchInput: {
      width: "100%",
      padding: "8px 12px 8px 32px",
      border: "1px solid var(--card-border-color, rgba(128,128,128,0.3))",
      borderRadius: 6,
      fontSize: 14,
      boxSizing: "border-box" as const,
      background: "var(--card-bg-color, transparent)",
      color: "var(--card-fg-color, inherit)",
      outline: "none",
    } as React.CSSProperties,
    dropdown: {
      border: "1px solid var(--card-border-color, rgba(128,128,128,0.2))",
      borderRadius: 6,
      background: "var(--card-bg-color, #1a1a1a)",
      maxHeight: 220,
      overflowY: "auto" as const,
      marginTop: 4,
      boxShadow: "0 4px 16px rgba(0,0,0,0.3)",
      zIndex: 100,
      position: "relative" as const,
    } as React.CSSProperties,
    dropdownMsg: {
      padding: 12,
      color: "var(--card-muted-fg-color, rgba(128,128,128,0.7))",
      textAlign: "center" as const,
      fontSize: 13,
    },
    dropdownItem: {
      display: "block",
      width: "100%",
      textAlign: "left" as const,
      padding: "9px 14px",
      background: "none",
      border: "none",
      borderBottom: "1px solid var(--card-border-color, rgba(128,128,128,0.1))",
      cursor: "pointer",
      textTransform: "capitalize" as const,
      fontSize: 14,
      color: "var(--card-fg-color, inherit)",
    } as React.CSSProperties,
    error: {
      color: "var(--card-badge-critical-fg-color, #f87171)",
      fontSize: 12,
      marginTop: 4,
    } as React.CSSProperties,
  };

  return (
    <div ref={containerRef} style={styles.root}>
      {/* Selected Pokémon preview */}
      {currentValue?.name && (
        <div style={styles.preview}>
          {currentValue.sprite && (
            <img
              alt={currentValue.name}
              height={64}
              src={currentValue.sprite}
              style={{ imageRendering: "pixelated" }}
              width={64}
            />
          )}
          <div>
            <div style={styles.previewName}>{currentValue.name}</div>
            <div style={styles.previewId}>
              #{String(currentValue.id).padStart(3, "0")}
            </div>
          </div>
          <button onClick={handleClear} style={styles.clearBtn} type="button">
            Clear
          </button>
        </div>
      )}

      {/* Search input */}
      <div style={styles.searchWrapper}>
        <SearchIcon size={14} style={styles.searchIcon} />
        <input
          onChange={(e) => {
            setSearch(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder="Search for a Pokémon…"
          style={styles.searchInput}
          type="text"
          value={search}
        />
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div style={styles.dropdown}>
          {selecting || loading ? (
            <div style={styles.dropdownMsg}>Loading…</div>
          ) : filtered.length === 0 ? (
            <div style={styles.dropdownMsg}>No Pokémon found</div>
          ) : (
            filtered.map((p) => (
              <button
                key={p.name}
                onClick={() => handleSelect(p)}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background =
                    "var(--card-muted-bg-color, rgba(128,128,128,0.1))";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background =
                    "none";
                }}
                style={styles.dropdownItem}
                type="button"
              >
                {p.name}
              </button>
            ))
          )}
        </div>
      )}

      {error && <p style={styles.error}>{error}</p>}
    </div>
  );
}
