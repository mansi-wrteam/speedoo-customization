import React, { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { t } from "@/utils/translation";
import { findDuplicateAddress } from "@/utils/addressDuplicate";
import { RiCloseFill } from "react-icons/ri";
import * as api from "@/api/apiRoutes";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { BiCurrentLocation } from "react-icons/bi";
import Loader from "../loader/Loader";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-toastify";
import LocationPickerMap from "@/components/map/LocationPickerMap";
import { useMapReady } from "@/components/map/useMapReady";
import { getTileConfig } from "@/utils/mapProvider";
import { forwardGeocode, reverseGeocode, type AddressParts } from "@/utils/geocoder";
import { toLatLng, type LatLng } from "@/utils/geo";
import { geolocationErrorMessage } from "@/utils/geolocation";
import type { Address } from "@/types/models";
import type { RootState } from "@/types/state";

interface NewAddressModalProps {
  showAddAddres: boolean;
  setShowAddAddres: React.Dispatch<React.SetStateAction<boolean>>;
  /** true = edit Redux `Addresses.selectedEditAddress`, false = add a new address. */
  isAddressSelected: boolean;
  /** Reloads the caller's address list after a successful add/update. */
  fetchAddress: () => void;
}

/** Form state. Fields loaded from a saved address can be undefined at runtime (see the edit effect). */
interface AddressFormDetails {
  name: string;
  mobile_num: string;
  alternate_mobile_num: string;
  address: string;
  landmark: string;
  city: string;
  area: string;
  pincode: string;
  state: string;
  country: string;
  /** Usually an AddressType ("Home" | "Office" | "Other"). */
  address_type: string;
  is_default: boolean;
}

/** Map / GPS point; `city` and `formatted_address` are only in the initial value. */
interface LocalLocation {
  city?: string;
  formatted_address?: string;
  lat: number;
  lng: number;
}

const NewAddressModal = ({
  showAddAddres,
  setShowAddAddres,
  isAddressSelected,
  fetchAddress,
}: NewAddressModalProps) => {
  const addresses = useSelector((state: RootState) => state.Addresses);
  const city = useSelector((state: RootState) => state.City.city);
  const theme = useSelector((state: RootState) => state.Theme.theme);
  const setting = useSelector((state: RootState) => state.Setting.setting);
  const language = useSelector((state: RootState) => state.Language.selectedLanguage?.code);
  const [addressLoading, setAddressLoading] = useState<string | boolean>("");
  const [showDuplicateWarning, setShowDuplicateWarning] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  /** Set once the customer answers "save it anyway". */
  const [duplicateConfirmed, setDuplicateConfirmed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [center, setCenter] = useState<LatLng>();
  // See the forward-geocode effect below for why this exists.
  const userTypedAddressRef = useRef(false);
  /** The typed address could not be found on the map, so the pin did not move. */
  const [pinNotFound, setPinNotFound] = useState(false);
  const [addressDetails, setaddressDetails] = useState<AddressFormDetails>({
    name: "",
    mobile_num: "",
    alternate_mobile_num: "",
    address: "",
    landmark: "",
    city: "",
    area: "",
    pincode: "",
    state: "",
    country: "",
    address_type: "Home",
    is_default: true,
  });

  // Google or OSM per the admin's Map Provider; Google's script loads only for Google.
  const { provider, ready: isLoaded, failed: mapFailed, loader: mapLoader } = useMapReady(setting);
  const [localLocation, setlocalLocation] = useState<LocalLocation>({
    city: "",
    formatted_address: "",
    lat: parseFloat(0 as unknown as string),
    lng: parseFloat(0 as unknown as string),
  });

  useEffect(() => {
    // An address being edited already has its point; a late GPS fix must not
    // move it to wherever the customer happens to be sitting.
    if (isAddressSelected) return;
    navigator.geolocation.getCurrentPosition((position) => {
      const lat = position.coords.latitude;
      const lng = position.coords.longitude;
      setlocalLocation({ lat: lat, lng: lng });
    });
  }, [showAddAddres, isAddressSelected]);

  useEffect(() => {
    setCenter({ lat: localLocation.lat, lng: localLocation.lng });
  }, [localLocation.lat, localLocation.lng]);

  // Typed address → pin. Only for text the customer TYPED (userTypedAddressRef):
  // a pin from a drag, a GPS fix or a saved address is already exact, and
  // re-geocoding the text it produced lands on the geocoder's best guess for
  // that string — far off in sparsely-mapped areas. That re-geocode used to
  // move a saved address's pin on every edit, so saving changed its point.
  useEffect(() => {
    if (!userTypedAddressRef.current) return;
    if (isLoaded && addressDetails.address !== "") {
      const fullAddress = [
        addressDetails.address,
        addressDetails.city,
        addressDetails.state,
        addressDetails.country,
      ]
        .filter(Boolean)
        .join(", ");
      // Wait for typing to pause: this used to geocode on every keystroke,
      // and the public OSM geocoder allows about one request a second.
      const timer = setTimeout(() => {
        forwardGeocode(setting, fullAddress, {
          language,
          // Prefer matches in the delivery city over same-named places abroad.
          near: toLatLng(city?.latitude, city?.longitude),
        })
          .then((result) => {
            if (result) {
              setlocalLocation({ lat: result.lat, lng: result.lng });
              setPinNotFound(false);
            } else {
              setPinNotFound(true);
            }
          })
          .catch((error) => {
            console.error("Geocode was not successful:", error);
            setPinNotFound(true);
          });
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [
    addressDetails.address,
    addressDetails.city,
    addressDetails.state,
    addressDetails.country,
    isLoaded,
    setting,
    language,
    city?.latitude,
    city?.longitude,
  ]);

  useEffect(() => {
    setPinNotFound(false);
    if (isAddressSelected && addresses.selectedEditAddress) {
      const saved = addresses.selectedEditAddress as Address;
      const savedPoint = toLatLng(saved.latitude, saved.longitude);
      // Use the point the address was saved with. Only an old address without
      // one is placed by geocoding its text.
      if (savedPoint) setlocalLocation(savedPoint);
      userTypedAddressRef.current = !savedPoint;
      setaddressDetails({
        name: (addresses.selectedEditAddress as Address).name,
        mobile_num: (addresses.selectedEditAddress as Address).mobile,
        alternate_mobile_num: (addresses.selectedEditAddress as Address).alternate_mobile,
        address: (addresses.selectedEditAddress as Address).address,
        landmark: (addresses.selectedEditAddress as Address).landmark,
        city: (addresses.selectedEditAddress as Address).city,
        area: (addresses.selectedEditAddress as Address).area,
        pincode: (addresses.selectedEditAddress as Address).pincode,
        state: (addresses.selectedEditAddress as Address).state,
        country: (addresses.selectedEditAddress as Address).country,
        address_type: (addresses.selectedEditAddress as Address).type,
        is_default:
          (addresses.selectedEditAddress as Address).is_default === 1 ? true : false,
      } as AddressFormDetails);
    } else {
      userTypedAddressRef.current = false;
      setlocalLocation({
        // Start the map at the selected delivery city (`city` is state.City.city).
        lat: parseFloat(String(city ? city.latitude : 0)),
        lng: parseFloat(String(city ? city.longitude : 0)),
      });
      setaddressDetails({
        name: "",
        mobile_num: "",
        alternate_mobile_num: "",
        address: "",
        landmark: "",
        city: "",
        area: "",
        pincode: "",
        state: "",
        country: "",
        address_type: "Home",
        is_default: true,
      });
    }
  }, [isAddressSelected, addresses?.selectedEditAddress, showAddAddres]);

  const handleConfirmAddress = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // §7: saving the same street line and pincode again is almost always a
    // double tap. Ask once; a confirmed answer saves it anyway.
    if (!duplicateConfirmed) {
      const duplicate = findDuplicateAddress(
        { address: addressDetails.address, pincode: addressDetails.pincode },
        addresses?.allAddresses,
        isAddressSelected ? (addresses?.selectedEditAddress as Address)?.id : null
      );
      if (duplicate) {
        setShowDuplicateWarning(true);
        return;
      }
    }
    setShowDuplicateWarning(false);
    setDuplicateConfirmed(false);
    let lat = center!.lat;
    let lng = center!.lng;
    if (!isAddressSelected) {
      setLoading(true);
      const response = await api.addAddress({
        name: addressDetails.name,
        mobile: addressDetails.mobile_num,
        type: addressDetails.address_type,
        address: addressDetails.address,
        landmark: addressDetails.landmark,
        area: addressDetails.area,
        pincode: addressDetails.pincode,
        city: addressDetails.city,
        state: addressDetails.state,
        country: addressDetails.country,
        alternate_mobile: addressDetails.alternate_mobile_num,
        latitiude: lat,
        longitude: lng,
        is_default: addressDetails.is_default,
      });
      if (response.status == 1) {
        fetchAddress();
        setLoading(false);
        toast.success(t("address_added_success"));
      } else {
        setLoading(false);
      }
      setaddressDetails({
        name: "",
        mobile_num: "",
        alternate_mobile_num: "",
        address: "",
        landmark: "",
        city: "",
        area: "",
        pincode: "",
        state: "",
        country: "",
        address_type: "Home",
        is_default: false,
      });
      setShowAddAddres(false);
    } else {
      setLoading(true);
      const response = await api.updateAddress({
        id: (addresses.selectedEditAddress as Address).id,
        name: addressDetails.name,
        mobile: addressDetails.mobile_num,
        type: addressDetails.address_type,
        address: addressDetails.address,
        landmark: addressDetails.landmark,
        area: addressDetails.area,
        pincode: addressDetails.pincode,
        city: addressDetails.city,
        state: addressDetails.state,
        country: addressDetails.country,
        alternate_mobile: addressDetails.alternate_mobile_num,
        latitiude: lat,
        longitude: lng,
        is_default: addressDetails.is_default,
      });
      if (response.status === 1) {
        toast.success("Succesfully Updated Address!");
        fetchAddress();
        setShowAddAddres(false);
        setLoading(false);
      } else {
        setLoading(false);
      }
    }
  };

  const handleHideAddressModal = () => {
    setaddressDetails({
      name: "",
      mobile_num: "",
      alternate_mobile_num: "",
      address: "",
      landmark: "",
      city: "",
      area: "",
      pincode: "",
      state: "",
      country: "",
      address_type: "Home",
      is_default: false,
    });
    setShowAddAddres(false);
  };

  const onMarkerDragStart = () => {
    setAddressLoading(true);
  };

  /** Fill the form from a geocoded point. Fields the geocoder left out stay blank for the user. */
  const fillAddressFields = (parts: AddressParts) => {
    // localLocation already holds the point the user picked — this text came
    // from it, so it must not be geocoded back onto the pin.
    userTypedAddressRef.current = false;
    setPinNotFound(false);
    setaddressDetails((state) => ({
      ...state,
      address: parts.address,
      landmark: parts.landmark,
      city: parts.city,
      area: parts.area,
      pincode: parts.pincode,
      country: parts.country,
      state: parts.state,
    }));
  };

  const onMarkerDragEnd = (point: LatLng) => {
    // The pin is where it was dropped, whatever the geocoder says.
    setlocalLocation({ lat: point.lat, lng: point.lng });
    setPinNotFound(false);
    reverseGeocode(setting, point, { language })
      .then((response) => {
        if (response) {
          // Use the coordinate the pin was actually dropped on, not the
          // reverse-geocode result's own point. In sparsely-mapped areas the
          // geocoder snaps to the nearest feature it has data for, which can be
          // far from the click (down to a whole governorate's label point) —
          // this call is only for pulling address text, not a position.
          setlocalLocation({ lat: point.lat, lng: point.lng });
          fillAddressFields(response.parts);
        }
      })
      .catch((error) => {
        console.log(error);
      })
      // Even with no answer (rate limit, nothing there), give the form back.
      .finally(() => setAddressLoading(false));
  };

  const handleCurrentLocationClick = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const latLng = {
            lat: parseFloat(position.coords.latitude as unknown as string),
            lng: parseFloat(position.coords.longitude as unknown as string),
          };
          setCenter(latLng);
          setlocalLocation(latLng);

          reverseGeocode(setting, latLng, { language })
            .then((response) => {
              if (response) {
                fillAddressFields(response.parts);
              } else {
                console.log("No result found");
              }
            })
            .catch((error) => {
              console.log(error);
            });
        },
        (error) => {
          console.error("Error detecting location", error);
          // The pin stays put, so say why the button did nothing.
          toast.error(geolocationErrorMessage(error));
        },
        {
          // FIX: Crucial for mobile devices to get an actual GPS lock
          enableHighAccuracy: true,
          // 5 s was too short for a desktop's network lookup to answer.
          timeout: 15000,
          maximumAge: 0,
        },
      );
    } else {
      console.log("geolocation not present in navigator");
    }
  };

  /** Typing the address moves the pin to it (see the forward-geocode effect). */
  const handleTypedAddress = (
    field: "address" | "city" | "state" | "country",
    value: string,
  ) => {
    userTypedAddressRef.current = true;
    setaddressDetails((state) => ({ ...state, [field]: value }));
  };

  const handleSetAddressType = (value: string) => {
    setaddressDetails((state) => ({ ...state, address_type: value }));
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setaddressDetails((prevDetails) => ({
      ...prevDetails,
      is_default: e.target.checked,
    }));
  };

  const duplicateDialog = showDuplicateWarning ? (
    <Dialog open>
      <DialogContent className="flex w-[400px] max-w-[calc(100vw-32px)] flex-col gap-4 rounded-2xl p-6 text-center">
        <DialogTitle className="text-[17px] font-bold text-[var(--foreground-primary)]">
          {t("duplicate_address_title")}
        </DialogTitle>
        <p className="text-sm leading-relaxed text-[var(--foreground-secondary)]">
          {t("duplicate_address_message")}
        </p>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setShowDuplicateWarning(false)}
            className="flex-1 rounded-lg px-4 py-2.5 text-sm font-bold text-[var(--button-outline-foreground-default)] outline outline-1 -outline-offset-1 outline-[var(--button-outline-border-default)]"
          >
            {t("cancel")}
          </button>
          <button
            type="button"
            onClick={() => {
              // Answered: let the next submit through untouched.
              setDuplicateConfirmed(true);
              setShowDuplicateWarning(false);
              formRef.current?.requestSubmit();
            }}
            className="flex-1 rounded-lg bg-[var(--button-primary-background-default)] px-4 py-2.5 text-sm font-bold text-[var(--button-primary-foreground-default)]"
          >
            {t("yes")}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  ) : null;

  return (
    <>
    {mapLoader}
    {duplicateDialog}
    <Dialog open={showAddAddres}> 
      <DialogContent className="max-w-5xl overflow-y-scroll md:overflow-hidden h-full md:h-auto">
        <DialogHeader>
          <div className="flex flex-row justify-between items-center">
            <h2 className="font-bold text-xl">{t("new_address")}</h2>
            <div className="cursor-pointer rounded-full bg-[var(--surface-subtle)] p-2 text-[var(--foreground-primary)] transition-colors hover:bg-[var(--surface-hover)]">
              <RiCloseFill size={22} onClick={() => handleHideAddressModal()} />
            </div>
          </div>
        </DialogHeader>
        <div className="p-2 ">
          <div className="flex gap-5 flex-col md:flex-row">
            <div className="w-full md:w-1/2 relative">
              <div
                className="absolute z-50 top-[10px] right-14 bg-[var(--surface-default)] p-[10px] cursor-pointer text-[var(--foreground-primary)]"
                onClick={handleCurrentLocationClick}
              >
                <BiCurrentLocation size={20} className=" " />
              </div>
              {mapFailed ? (
                <p className="py-10 text-center text-sm text-[var(--status-error-default)]">
                  {t("map_unavailable") || "The map could not be loaded. Please try again later."}
                </p>
              ) : isLoaded ? (
                // Square on phones and tablets; the tall 700px panel only
                // beside the form on desktop.
                <div className="aspect-square w-full lg:aspect-auto lg:h-[700px]">
                  <LocationPickerMap
                    provider={provider}
                    tiles={getTileConfig(setting)}
                    dark={theme == "dark"}
                    zoom={11}
                    center={center}
                    height="100%"
                    onMarkerDragStart={onMarkerDragStart}
                    onMarkerDragEnd={onMarkerDragEnd}
                  />
                </div>
              ) : (
                <Loader />
              )}
              {pinNotFound && (
                <p className="mt-2 text-sm text-[var(--foreground-tertiary)]">
                  {t("address_not_found_on_map") ||
                    "We couldn't find this address on the map. Drag the pin to the exact spot."}
                </p>
              )}
            </div>
            <div className="w-full md:w-1/2 h-full">
              {addressLoading ? (
                <div className="flex items-center justify-center">
                  <Loader
                    width={Math.min(300, window.innerWidth - 40)}
                    height={Math.min(300, window.innerWidth - 40)}
                  />
                </div>
              ) : (
                <div className="flex flex-col">
                  <form
                    className="flex flex-col gap-5"
                    ref={formRef}
                    onSubmit={handleConfirmAddress}
                  >
                    <div className="flex flex-col gap-2">
                      <h1>{t("contact_details")}</h1>
                      <div className="flex flex-col gap-2">
                        <input
                          type="text"
                          placeholder={t("name")}
                          className="w-full rounded-lg bg-[var(--form-default-background)] p-2 text-base leading-6 text-[var(--form-default-text)] placeholder:text-[var(--form-default-placeholder)] outline outline-1 -outline-offset-1 outline-[var(--form-default-border)] focus:outline-[var(--form-focus-filled-border)]"
                          value={addressDetails.name}
                          onChange={(e) =>
                            setaddressDetails((state) => ({
                              ...state,
                              name: e.target.value,
                            }))
                          }
                          required
                        />
                        <input
                          type="number"
                          placeholder={t("mobileNumber")}
                          className="w-full rounded-lg bg-[var(--form-default-background)] p-2 text-base leading-6 text-[var(--form-default-text)] placeholder:text-[var(--form-default-placeholder)] outline outline-1 -outline-offset-1 outline-[var(--form-default-border)] focus:outline-[var(--form-focus-filled-border)]"
                          value={addressDetails.mobile_num}
                          onChange={(e) =>
                            setaddressDetails((state) => ({
                              ...state,
                              mobile_num: e.target.value,
                            }))
                          }
                          required
                        />
                        <input
                          type="number"
                          placeholder={t("alt_mobile_no")}
                          className="w-full rounded-lg bg-[var(--form-default-background)] p-2 text-base leading-6 text-[var(--form-default-text)] placeholder:text-[var(--form-default-placeholder)] outline outline-1 -outline-offset-1 outline-[var(--form-default-border)] focus:outline-[var(--form-focus-filled-border)]"
                          value={addressDetails.alternate_mobile_num}
                          onChange={(e) =>
                            setaddressDetails((state) => ({
                              ...state,
                              alternate_mobile_num: e.target.value,
                            }))
                          }
                        />
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <h1>{t("address_details")}</h1>
                      <input
                        type="text"
                        placeholder={t("address")}
                        className="w-full rounded-lg bg-[var(--form-default-background)] p-2 text-base leading-6 text-[var(--form-default-text)] placeholder:text-[var(--form-default-placeholder)] outline outline-1 -outline-offset-1 outline-[var(--form-default-border)] focus:outline-[var(--form-focus-filled-border)]"
                        value={addressDetails.address}
                        onChange={(e) => handleTypedAddress("address", e.target.value)}
                        required
                      />
                      <input
                        type="text"
                        placeholder={t("enter_landmark")}
                        className="w-full rounded-lg bg-[var(--form-default-background)] p-2 text-base leading-6 text-[var(--form-default-text)] placeholder:text-[var(--form-default-placeholder)] outline outline-1 -outline-offset-1 outline-[var(--form-default-border)] focus:outline-[var(--form-focus-filled-border)]"
                        value={addressDetails.landmark}
                        onChange={(e) =>
                          setaddressDetails((state) => ({
                            ...state,
                            landmark: e.target.value,
                          }))
                        }
                        required
                      />
                      <input
                        type="text"
                        placeholder={t("enter_area")}
                        className="w-full rounded-lg bg-[var(--form-default-background)] p-2 text-base leading-6 text-[var(--form-default-text)] placeholder:text-[var(--form-default-placeholder)] outline outline-1 -outline-offset-1 outline-[var(--form-default-border)] focus:outline-[var(--form-focus-filled-border)]"
                        value={addressDetails.area}
                        onChange={(e) =>
                          setaddressDetails((state) => ({
                            ...state,
                            area: e.target.value,
                          }))
                        }
                        required
                      />
                      <input
                        type="text"
                        placeholder={t("enter_pincode")}
                        className="w-full rounded-lg bg-[var(--form-default-background)] p-2 text-base leading-6 text-[var(--form-default-text)] placeholder:text-[var(--form-default-placeholder)] outline outline-1 -outline-offset-1 outline-[var(--form-default-border)] focus:outline-[var(--form-focus-filled-border)]"
                        value={addressDetails.pincode}
                        onChange={(e) =>
                          setaddressDetails((state) => ({
                            ...state,
                            pincode: e.target.value,
                          }))
                        }
                        required
                      />
                      <input
                        type="text"
                        placeholder={t("enter_city")}
                        className="w-full rounded-lg bg-[var(--form-default-background)] p-2 text-base leading-6 text-[var(--form-default-text)] placeholder:text-[var(--form-default-placeholder)] outline outline-1 -outline-offset-1 outline-[var(--form-default-border)] focus:outline-[var(--form-focus-filled-border)]"
                        value={addressDetails.city}
                        onChange={(e) => handleTypedAddress("city", e.target.value)}
                        required
                      />
                      <input
                        type="text"
                        placeholder={t("enter_state")}
                        className="w-full rounded-lg bg-[var(--form-default-background)] p-2 text-base leading-6 text-[var(--form-default-text)] placeholder:text-[var(--form-default-placeholder)] outline outline-1 -outline-offset-1 outline-[var(--form-default-border)] focus:outline-[var(--form-focus-filled-border)]"
                        value={addressDetails.state}
                        onChange={(e) => handleTypedAddress("state", e.target.value)}
                        required
                      />
                      <input
                        type="text"
                        placeholder={t("enter_country")}
                        className="w-full rounded-lg bg-[var(--form-default-background)] p-2 text-base leading-6 text-[var(--form-default-text)] placeholder:text-[var(--form-default-placeholder)] outline outline-1 -outline-offset-1 outline-[var(--form-default-border)] focus:outline-[var(--form-focus-filled-border)]"
                        value={addressDetails.country}
                        onChange={(e) => handleTypedAddress("country", e.target.value)}
                        required
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <h1 className="text-base font-medium leading-6 text-[var(--foreground-primary)]">{t("address_type")}</h1>
                      <div className="flex gap-1">
                        <ToggleGroup type="single">
                          <ToggleGroupItem
                            value="Home"
                            className={`rounded-sm p-2 ${
                              addressDetails.address_type == "Home"
                                ? "bg-[var(--brand-background-default)] text-[var(--brand-foreground-inverse)]"
                                : "bg-[var(--surface-default)] text-[var(--foreground-primary)] outline outline-1 -outline-offset-1 outline-[var(--border-subtle)]"
                            }`}
                            onClick={() => handleSetAddressType("Home")}
                          >
                            <h1>{t("adress_type_home")}</h1>
                          </ToggleGroupItem>
                          <ToggleGroupItem
                            value="Office"
                            className={`rounded-sm p-2 ${
                              addressDetails.address_type == "Office"
                                ? "bg-[var(--brand-background-default)] text-[var(--brand-foreground-inverse)]"
                                : "bg-[var(--surface-default)] text-[var(--foreground-primary)] outline outline-1 -outline-offset-1 outline-[var(--border-subtle)]"
                            }`}
                            onClick={() => handleSetAddressType("Office")}
                          >
                            <h1>{t("address_type_office")}</h1>
                          </ToggleGroupItem>
                          <ToggleGroupItem
                            value="Other"
                            className={`rounded-sm p-2 ${
                              addressDetails.address_type == "Other"
                                ? "bg-[var(--brand-background-default)] text-[var(--brand-foreground-inverse)]"
                                : "bg-[var(--surface-default)] text-[var(--foreground-primary)] outline outline-1 -outline-offset-1 outline-[var(--border-subtle)]"
                            }`}
                            onClick={() => handleSetAddressType("Other")}
                          >
                            <h1>{t("address_type_other")}</h1>
                          </ToggleGroupItem>
                        </ToggleGroup>
                      </div>
                      <div className="flex gap-2 mt-2">
                        <input
                          type="checkbox"
                          name=""
                          id=""
                          checked={addressDetails.is_default}
                          value={addressDetails.is_default as unknown as string}
                          onChange={handleCheckboxChange}
                        />
                        <p className="text-sm font-medium leading-5 text-[var(--foreground-primary)]">
                          {t("set_as_default_address")}
                        </p>
                      </div>
                    </div>
                    <button
                      type="submit"
                      className="rounded-lg px-4 py-2 text-base font-medium leading-6 bg-[var(--button-primary-background-default)] text-[var(--button-primary-foreground-default)] transition-colors hover:bg-[var(--button-primary-background-hover)] disabled:bg-[var(--button-primary-background-disabled)] disabled:text-[var(--button-primary-foreground-disabled)]"
                      // §7: stays disabled until the map has actually
                      // resolved an address for the pin — no more saving a
                      // half-loaded location.
                      disabled={loading || !addressDetails.address?.trim()}
                    >
                      {loading ? t("loading") : t("confirm_location")}
                    </button>
                  </form>
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
};

export default NewAddressModal;
