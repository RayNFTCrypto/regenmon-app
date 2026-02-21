import { useState } from "react";
import { TypeSelector } from "./TypeSelector";
import { SpriteDisplay } from "./SpriteDisplay";
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
      <div className="creation-header">
        <p className="creation-label">AETHERIA</p>
        <h1 className="creation-title">Invoca tu criatura</h1>
      </div>

      {step === 1 && (
        <div className="creation-step fade-in">
          <h2>¿Cómo se llama tu criatura?</h2>
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
            style={name.trim() ? { "--btn-color": "#00BFFF" } : {}}
          >
            Siguiente
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="creation-step fade-in">
          <h2>Elige su esencia</h2>
          <TypeSelector selected={selectedType} onSelect={setSelectedType} />
          <div className="step-buttons">
            <button className="btn-secondary" onClick={() => setStep(1)}>
              Atrás
            </button>
            <button
              className="btn-primary"
              disabled={!selectedType}
              onClick={() => setStep(3)}
              style={
                selectedType
                  ? { "--btn-color": regenmonTypes[selectedType].color }
                  : {}
              }
            >
              Siguiente
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="creation-step fade-in">
          <h2>¿Listo para invocarla?</h2>
          <div className="creation-preview">
            <SpriteDisplay type={regenmonTypes[selectedType]} size={100} />
            <p className="preview-name">{name}</p>
            <p className="preview-type">
              Tipo: {regenmonTypes[selectedType].name}
            </p>
          </div>
          <div className="step-buttons">
            <button className="btn-secondary" onClick={() => setStep(2)}>
              Atrás
            </button>
            <button
              className="btn-create"
              onClick={handleCreate}
              style={{ "--btn-color": regenmonTypes[selectedType].color }}
            >
              ¡Invocar!
            </button>
          </div>
        </div>
      )}

      <div className="step-indicator">
        {[1, 2, 3].map((s) => (
          <span
            key={s}
            className={`dot ${step >= s ? "active" : ""}`}
            style={
              step >= s && selectedType
                ? { background: regenmonTypes[selectedType]?.color }
                : {}
            }
          />
        ))}
      </div>
    </div>
  );
}
