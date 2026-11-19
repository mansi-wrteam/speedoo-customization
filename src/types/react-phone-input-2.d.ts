// react-phone-input-2 applies `className` to its container <div>
// (lib.js: className: "... " + this.props.className), but its bundled
// PhoneInputProps type leaves the prop out. Register passes one.
export {};

declare module "react-phone-input-2" {
  interface PhoneInputProps {
    className?: string;
  }
}
