import Scene from "./Scene.tsx";
/** Animated scene by default. Set NEXT_PUBLIC_LOGIN_PHOTO (for example /login.jpg in /public) to use your own photo. */
export default function Backdrop() {
  const photo = process.env.NEXT_PUBLIC_LOGIN_PHOTO;
  return <div className="backdrop">{photo ? <img className="photo" src={photo} alt="" /> : <Scene />}</div>;
}
