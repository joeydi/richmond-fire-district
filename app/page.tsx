import { AnimatedMap } from "@/components/map/animated-map";
import { LoginForm } from "@/components/auth/login-form";

export default function Home() {
  return (
    <div className="flex min-h-screen">
      {/* Left side - Login Form */}
      <div className="flex w-full flex-col items-center justify-center bg-white px-8 lg:w-1/2">
        <LoginForm />
      </div>

      {/* Right side - Animated 3D Map */}
      <div className="hidden lg:block lg:w-1/2">
        <AnimatedMap />
      </div>
    </div>
  );
}
