import { useState } from "react";
import { TypeSelector } from "./TypeSelector";
import { regenmonTypes } from "../data/regenmonTypes";

export function CreationFlow({ onCreate }) {
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [selectedType, setSelectedType] = useState(null);

  const handleCreate = () => {
    if (!name.trim() || !selectedType) return;
    const type = regenmonTypes[selectedType];
    onCreate({
      name: name.trim(),
      type: selectedType,
      stats: { ...type.stats },
      createdAt: new Date().toISOString(),
    });
  };

  return (
    <div className="creation-flow">
      <h1 className="creation-title">Crea tu Regenmon</h1>

      {step === 1 && (
        <div className="creation-step fade-in">
          <h2>¿Cómo se llama tu Regenmon?</h2>
          <input
            type="text"
            className="name-input"
            placeholder="Escribe un nombre..."
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={20}
            autoFocus
          />
          <button
            className="btn-primary"
            disabled={!name.trim()}
            onClick={() => setStep(2)}
          >
            Siguiente
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="creation-step fade-in">
          <h2>Elige su tipo</h2>
          <TypeSelector selected={selectedType} onSelect={setSelectedType} />
          <div className="step-buttons">
            <button className="btn-secondary" onClick={() => setStep(1)}>
              Atrás
            </button>
            <button
              className="btn-primary"
              disabled={!selectedType}
              onClick={() => setStep(3)}
            >
              Siguiente
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="creation-step fade-in">
          <h2>¿Listo para darle vida?</h2>
          <div className="creation-preview">
            <span className="preview-emoji">
              {regenmonTypes[selectedType].emoji}
            </span>
            <p className="preview-name">{name}</p>
            <p className="preview-type">
              Tipo: {regenmonTypes[selectedType].name}
            </p>
          </div>
          <div className="step-buttons">
            <button className="btn-secondary" onClick={() => setStep(2)}>
              Atrás
            </button>
            <button className="btn-create" onClick={handleCreate}>
              ¡Dar vida!
            </button>
          </div>
        </div>
      )}

      <div className="step-indicator">
        {[1, 2, 3].map((s) => (
          <span key={s} className={`dot ${step >= s ? "active" : ""}`} />
        ))}
      </div>
    </div>
  );
}
