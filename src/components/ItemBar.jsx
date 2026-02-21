import { useState } from "react";
import { ITEMS, CATEGORIES } from "../data/items";

export function ItemBar({ onUseItem, typeKey }) {
  const [activeCategory, setActiveCategory] = useState("food");
  const [usedItem, setUsedItem] = useState(null);

  const filteredItems = Object.values(ITEMS).filter(
    (item) => item.category === activeCategory
  );

  const handleUse = (item) => {
    setUsedItem(item.id);
    onUseItem(item);
    setTimeout(() => setUsedItem(null), 600);
  };

  return (
    <div className="item-bar">
      {/* Categorías */}
      <div className="item-categories">
        {Object.entries(CATEGORIES).map(([key, cat]) => (
          <button
            key={key}
            className={`item-cat-btn ${activeCategory === key ? "active" : ""}`}
            onClick={() => setActiveCategory(key)}
            style={{ "--cat-color": cat.color }}
          >
            <span className="cat-icon">{cat.icon}</span>
            <span className="cat-label">{cat.label}</span>
          </button>
        ))}
      </div>

      {/* Items */}
      <div className="item-list">
        {filteredItems.map((item) => (
          <button
            key={item.id}
            className={`item-card ${usedItem === item.id ? "item-used" : ""}`}
            onClick={() => handleUse(item)}
            title={item.description}
          >
            <img
              src={item.sprite}
              alt={item.name}
              className="item-sprite"
              draggable={false}
            />
            <span className="item-name">{item.name}</span>
            <div className="item-effects">
              {Object.entries(item.effects).map(([stat, val]) => (
                <span
                  key={stat}
                  className={`item-effect ${val > 0 ? "positive" : "negative"}`}
                >
                  {val > 0 ? "+" : ""}
                  {val}
                </span>
              ))}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
