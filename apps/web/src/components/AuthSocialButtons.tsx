// components/AuthSocialButtons.tsx
import { FcGoogle } from "react-icons/fc";
import { FaFacebook } from "react-icons/fa";

export default function AuthSocialButtons() {
  return (
    <div className="flex gap-4">
      <button className="flex items-center gap-2 w-full border py-2 px-4 rounded-md hover:bg-gray-100">
        <FcGoogle className="text-2xl" />
        <span>Login with Google</span>
      </button>
      <button className="flex items-center gap-2 w-full border py-2 px-4 rounded-md hover:bg-gray-100">
        <FaFacebook className="text-2xl text-blue-600" />
        <span>Login with Facebook</span>
      </button>
    </div>
  );
}
