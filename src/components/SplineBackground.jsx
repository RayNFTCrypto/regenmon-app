import { lazy, Suspense } from "react";

const Spline = lazy(() => import("@splinetool/react-spline"));

export function SplineBackground() {
  return (
    <div className="spline-bg">
      <Suspense fallback={null}>
        <Spline scene="/reactive_background.spline" />
      </Suspense>
    </div>
  );
}
