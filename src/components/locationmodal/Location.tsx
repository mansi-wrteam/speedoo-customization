import { useState, useRef, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogOverlay,
} from "@/components/ui/dialog";
import { t } from "@/utils/translation";
import { useSelector } from "react-redux";
import ImageWithPlaceholder from "@/components/image-with-placeholder/ImageWithPlaceholder";
import { FaLocationCrosshairs } from "react-icons/fa6";
import { resolveLogoUrl } from "@/lib/utils";
import * as api from "@/api/apiRoutes";
import { setCity } from "@/redux/slices/citySlice";
import { writeCityCookie } from "@/utils/ssrCookies";
import { toast } from "react-toastify";
import { useDispatch } from "react-redux";
import Loader from "../loader/Loader";
import { RiCloseFill } from "react-icons/ri";
import LocationPickerMap from "@/components/map/LocationPickerMap";
import { useMapReady } from "@/components/map/useMapReady";
import { getTileConfig } from "@/utils/mapProvider";
import { reverseGeocode } from "@/utils/geocoder";
import { geolocationErrorMessage } from "@/utils/geolocation";
import { toLatLng, type LatLng } from "@/utils/geo";
import type { ApiResponse } from "@/types/api";
import type { City } from "@/types/models";
import type { PlaceSuggestion, PlacesAutocompleteData } from "@/api/apiRoutes";
import type { RootState } from "@/types/state";
import type { AppDispatch } from "@/redux/hooks";

interface LocationProps {
  showLocation: boolean;
  setShowLocation: React.Dispatch<React.SetStateAction<boolean>>;
}

/** The point picked on the map / from search, before it is confirmed as the delivery city. */
interface LocalLocation {
  /** `null` when the point is outside every deliverable city. */
  city?: string | null;
  formatted_address?: string;
  lat: number;
  lng: number;
}

/** getAvailableCity resolves to the getCity() response, or its own `{ status: 0, message }` on failure. */
type CityLookup = Omit<ApiResponse<City>, "data"> & { data?: City };

const Location = ({ showLocation, setShowLocation }: LocationProps) => {
  const city = useSelector((state: RootState) => state.City);
  const setting = useSelector((state: RootState) => state.Setting);
  const theme = useSelector((state: RootState) => state.Theme.theme);
  const language = useSelector((state: RootState) => state.Language.selectedLanguage?.code);
  const inputDomRef = useRef<HTMLInputElement>(null);
  const debounceTimeoutRef = useRef<ReturnType<typeof setTimeout>>(null);
  const dispatch = useDispatch<AppDispatch>();
  const [mapView, setMapView] = useState(false);
  const [addressLoading, setAddressLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, seterrorMsg] = useState<string | undefined>("");
  const [center, setCenter] = useState<LatLng>();
  const [inputValue, setInputValue] = useState("");
  const [resultedPlaces, setResultedPlaces] = useState<PlacesAutocompleteData>([] as unknown as PlacesAutocompleteData);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  

  // Google or OSM per the admin's Map Provider; Google's script loads only for Google.
  const { provider, ready: isLoaded, failed: mapFailed, loader: mapLoader } = useMapReady(setting.setting);
  // Map clicks wait for a pause, and only the newest pick may write its answer.
  const clickTimerRef = useRef<ReturnType<typeof setTimeout>>(null);
  const pickSeqRef = useRef(0);

  const [localLocation, setlocalLocation] = useState<LocalLocation>({
    city: "",
    formatted_address: "",
    lat: parseFloat(0 as unknown as string),
    lng: parseFloat(0 as unknown as string),
  });

  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        setlocalLocation({ lat: lat, lng: lng });
      },
      (error) => {
        // No-GPS devices can fail here (browser network provider 429). Fail
        // quietly — the user can still pick a location manually.
        console.log("Geolocation error (initial):", error);
      },
      {
        // Coarse + cached: avoid forcing a fresh high-accuracy network lookup
        // (the call that hits Google's rate-limited provider on desktops).
        enableHighAccuracy: false,
        timeout: 15000,
        maximumAge: 300000,
      }
    );
  }, [showLocation]);

  useEffect(() => {
    setCenter({ lat: localLocation.lat, lng: localLocation.lng });
  }, [localLocation.lat, localLocation.lng]);

  useEffect(() => {
    const inputEl = inputDomRef.current;
    if (inputEl) {
      inputEl.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      if (inputEl) {
        inputEl.removeEventListener("keydown", handleKeyDown);
      }
    };
  }, [resultedPlaces, highlightedIndex]);

  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
      if (clickTimerRef.current) {
        clearTimeout(clickTimerRef.current);
      }
    };
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    debounceTimeoutRef.current = setTimeout(() => {
      if (value.length > 2) {
        handleFetchPlaces(value);
      } else {
        setResultedPlaces([] as unknown as PlacesAutocompleteData);
      }
    }, 1000);
  };

  const handleCloseLocation = () => {
    setShowLocation(false);
    setMapView(false);
  };

  /** Show the map with the pin at `point` and its address underneath. */
  const openMapAt = (point: LatLng) => {
    setMapView(true);
    pickPoint(point);
  };

  const handleViewMap = async () => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        openMapAt({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      (error) => {
        // Error callback
        console.log("Geolocation error:", error);

        // No position from the browser (OS location off, no Wi-Fi, denied):
        // instead of a dead end, open the map at the city we already know so
        // the pin can be dragged by hand. The map is the answer, so no toast.
        const fallback =
          toLatLng(city?.city?.latitude, city?.city?.longitude) ??
          toLatLng(
            setting.setting?.default_city?.latitude,
            setting.setting?.default_city?.longitude,
          );
        if (fallback) {
          openMapAt(fallback);
          return;
        }

        toast.error(geolocationErrorMessage(error));
      },
      {
        // Coarse + cached so the browser can reuse a recent position instead of
        // forcing a fresh high-accuracy network call (which hits Google's
        // rate-limited provider / 429 on no-GPS devices).
        enableHighAccuracy: false,
        timeout: 15000,
        maximumAge: 300000,
      },
    );
  };

  const handleConfirmLocation = async (
    latitude?: number,
    longitude?: number,
    cityName?: string,
    formattedAddress?: string,
  ) => {
    try {
      if (errorMessage !== "") {
        setInputValue("");
        toast.error("We are not deliver on this city");
        return;
      }
      const result = await api.getCity({
        latitude: latitude ? latitude : localLocation.lat,
        longitude: longitude ? longitude : localLocation.lng,
      });
      if (result?.status == 1) {
        // Cookie so the SERVER renders this city's prices and stock next time;
        // redux-persist lives in localStorage, which it never sees.
        writeCityCookie(result.data);
        dispatch(
          setCity({
            data: {
              id: result.data.id,
              name: cityName || localLocation.city || result.data.name,
              state: result.data.state,
              // The geocoder may have had no answer; never save an empty
              // "Deliver to" — the backend's city is always known here.
              formatted_address:
                formattedAddress ||
                localLocation.formatted_address ||
                [result.data.name, result.data.state].filter(Boolean).join(", "),
              latitude: result.data.latitude,
              longitude: result.data.longitude,
              min_amount_for_free_delivery:
                result.data.min_amount_for_free_delivery,
              delivery_charge_method: result.data.delivery_charge_method,
              fixed_charge: result.data.fixed_charge,
              per_km_charge: result.data.per_km_charge,
              time_to_travel: result.data.time_to_travel,
              max_deliverable_distance: result.data.max_deliverable_distance,
              distance: result.data.distance,
            },
          }),
        );
        // No shop fetch here: Home's query is keyed on the city, so setCity above
        // reloads it — for the module active THEN. A fetch from here landed late
        // and overwrote Home with whatever module was active when it started.
        setShowLocation(false);
        setInputValue("");
        setResultedPlaces([] as unknown as PlacesAutocompleteData);
        setAddressLoading(false);
        seterrorMsg("");
        setMapView(false);
      } else if (result.status == 0) {
        setLoading(false);
        toast.error(t("We_doesn't_deliver_at_selected_city"));
        setShowLocation(true);
      } else {
        setLoading(false);
        seterrorMsg(result.message);
      }
    } catch (error) {
      console.log("error", error);
    }
  };

  const getAvailableCity = async (point: LatLng): Promise<CityLookup> => {
    try {
      return await api.getCity({ latitude: point.lat, longitude: point.lng });
    } catch (error) {
      console.error("Error in getAvailableCity:", error);
      return { status: 0, message: "Error fetching city" };
    }
  };

  /**
   * Put the pin exactly where the customer chose and describe that spot.
   *
   * The geocoder's own point is NOT used: it snaps to the nearest road or
   * building it knows, which moved the pin away from the pick. Deliverability
   * is asked of the backend with the picked point, so it works even when the
   * geocoder has no answer (rate limit, empty area) — the address then stays
   * blank and Confirm falls back to the city name.
   */
  const pickPoint = async (point: LatLng) => {
    const seq = ++pickSeqRef.current;
    setlocalLocation((state) => ({ ...state, lat: point.lat, lng: point.lng }));
    setAddressLoading(true);

    const [geocoded, result] = await Promise.all([
      reverseGeocode(setting.setting, point, { language }).catch((error) => {
        console.log("err", error);
        // A Google failure is a key/config problem worth surfacing; an OSM
        // one is a busy public server, and the blank address covers it.
        if (provider === "google") toast.error(t("provided_api_invalid"));
        return null;
      }),
      getAvailableCity(point),
    ]);
    if (seq !== pickSeqRef.current) return;

    setlocalLocation({
      formatted_address: geocoded?.formattedAddress ?? "",
      city: result.status === 1 ? result?.data?.name : null,
      lat: point.lat,
      lng: point.lng,
    });
    seterrorMsg(result.status === 1 ? "" : result.message);
    setAddressLoading(false);
  };

  const handleMapClick = (point: LatLng) => {
    if (clickTimerRef.current) clearTimeout(clickTimerRef.current);
    clickTimerRef.current = setTimeout(() => pickPoint(point), 500);
  };

  const onMarkerDragStart = () => {
    setAddressLoading(true);
  };

  const handleDragEnd = (point: LatLng) => {
    pickPoint(point);
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (!resultedPlaces?.suggestions?.length) return;
    if (e.key === "ArrowDown") {
      setHighlightedIndex((prev) =>
        prev < (resultedPlaces.suggestions?.length as number) - 1 ? prev + 1 : 0,
      );
    } else if (e.key === "ArrowUp") {
      setHighlightedIndex((prev) =>
        prev > 0 ? prev - 1 : (resultedPlaces?.suggestions?.length as number) - 1,
      );
    } else if (e.key === "Enter") {
      if (highlightedIndex >= 0) {
        const selected = resultedPlaces?.suggestions![highlightedIndex];
        handleSelectLocation(selected?.placePrediction);
      }
    }
  };

  const handleFetchPlaces = async (input: string) => {
    setHighlightedIndex(-1);
    try {
      const response = await api.getPlaces({ input: input });
      if (response.status === 1) {
        setResultedPlaces(response.data);
      } else {
        toast.error(response.message);
      }
    } catch (error) {
      console.error("Error fetching places:", error);
      toast.error("Failed to fetch places");
    }
  };

  const handleSelectLocation = (place: PlaceSuggestion["placePrediction"]) => {
    const description = `${place.structuredFormat.mainText.text}, ${place.structuredFormat.secondaryText.text}`;
    setInputValue(description);
    // setSelectedLocation(place);
    setResultedPlaces([] as unknown as PlacesAutocompleteData);
    getPlacecDetails(place);
    setHighlightedIndex(-1);
  };

  const getPlacecDetails = async (place: PlaceSuggestion["placePrediction"]) => {
    try {
      const response = await api.getPlacesDetails({
        placeId: place.placeId,
      });

      if (response.status === 1) {
        const { latitude, longitude } = response?.data?.location;
        let cityName = response.data.addressComponents?.[0].longText;
        let formattedAddress = response.data.formattedAddress;
        setlocalLocation({
          formatted_address: response.data.formattedAddress,
          city: response.data.addressComponents?.[0].longText,
          lat: parseFloat(latitude as unknown as string),
          lng: parseFloat(longitude as unknown as string),
        });
        await handleConfirmLocation(
          latitude,
          longitude,
          cityName,
          formattedAddress,
        );
        setAddressLoading(false);
      } else {
        // toast.error(response.message);
        setInputValue("");
        seterrorMsg(response.message);
      }
    } catch (error) {
      console.log("Error fetching place details:", error);
    }
  };

  const handleShowModal = () => {
    setShowLocation(false);
    setMapView(false);
  };

  return (
    <>
      {mapLoader}
      {loading ? (
        <Loader screen={"full"} />
      ) : (
        <Dialog open={showLocation} onOpenChange={handleCloseLocation}>
          <DialogOverlay
            className={`${
              theme == "light"
                ? setting.setting?.default_city == null && city?.city == null
                  ? "bg-white/100"
                  : "bg-white/10"
                : setting.setting?.default_city == null && city?.city == null
                  ? "bg-black/100"
                  : "bg-black/10"
            }`}
          />
          <DialogContent onInteractOutside={(e) => e.preventDefault()} className="rounded-2xl border-0 bg-[var(--surface-default)]">
            <DialogHeader className="flex flex-row items-center justify-between">
              <div className="text-xl font-semibold leading-7 text-[var(--foreground-primary)]">{t("select_location")}</div>
              {setting.setting?.default_city == null && city?.city == null ? (
                <></>
              ) : (
                <div className="cursor-pointer rounded-full bg-[var(--surface-subtle)] p-2 text-[var(--foreground-primary)] transition-colors hover:bg-[var(--surface-hover)]">
                  <RiCloseFill size={22} onClick={() => handleShowModal()} />
                </div>
              )}
            </DialogHeader>
            <div className="flex">
              {!mapView ? (
                <div className="flex flex-col gap-3 w-full">
                  <div className="relative h-[100px]  m-8">
                    {/* Missing or broken logo → the admin placeholder image. */}
                    <ImageWithPlaceholder
                      src={resolveLogoUrl(setting?.setting?.web_settings, theme)}
                      sizes="400px"
                      className=" object-contain"
                      alt="logo"
                    />
                  </div>
                  <h2 className="text-center text-lg font-semibold leading-7 text-[var(--foreground-primary)]">
                    {t("select_delivery_location")}
                  </h2>
                  <button
                    className="mt-7 m-auto flex w-full items-center justify-center gap-1 rounded-lg px-4 py-2 text-base font-medium leading-6 outline outline-1 -outline-offset-1 outline-[var(--button-outline-border-default)] text-[var(--button-outline-foreground-default)] transition-colors hover:bg-[var(--button-outline-background-hover)] hover:text-[var(--button-outline-foreground-hover)]"
                    onClick={handleViewMap}
                  >
                    <FaLocationCrosshairs /> {t("use_my_current_location")}
                  </button>
                  <div className="flex items-center justify-between my-4 gap-2">
                    <hr className="flex-grow border-t border-solid border-[var(--border-subtle)]" />
                    <span className="text-base font-medium leading-6 text-[var(--foreground-tertiary)]">OR</span>
                    <hr className="flex-grow border-t border-solid border-[var(--border-subtle)]" />
                  </div>

                  <div className="flex flex-col gap-2">
                    <div>
                      <input
                        ref={inputDomRef}
                        type="text"
                        name=""
                        id=""
                        value={inputValue}
                        placeholder={t("select_delivery_location")}
                        className="w-full rounded-lg bg-[var(--form-default-background)] p-2 text-sm text-[var(--form-default-text)] outline outline-1 -outline-offset-1 outline-[var(--form-default-border)] focus:outline-[var(--form-focus-filled-border)] placeholder:text-center placeholder:text-[var(--form-default-placeholder)]"
                        onFocus={() => {
                          // setcurrLocationClick(false);
                          // setisInputFields(true);
                        }}
                        onChange={(event) => {
                          handleInputChange(event);
                        }}
                        onBlur={() => {
                          // setisInputFields(false);
                        }}
                      />
                    </div>
                    <div className="w-full relative">
                      {(resultedPlaces?.suggestions?.length as number) > 0 && (
                        <div
                          className="absolute z-10 max-h-[200px] w-full overflow-y-auto rounded-lg bg-[var(--surface-default)] shadow-lg outline outline-1 -outline-offset-1 outline-[var(--border-subtle)]"
                          role="listbox"
                        >
                          {resultedPlaces?.suggestions?.map((item, index) => (
                            <div
                              role="option"
                              key={index}
                              className={`p-2 cursor-pointer transition-colors duration-150 ${
                                highlightedIndex === index
                                  ? "bg-[var(--brand-background-subtle)] text-[var(--brand-foreground-default)]"
                                  : "text-[var(--foreground-primary)] hover:bg-[var(--surface-hover)]"
                              }`}
                              onClick={() =>
                                handleSelectLocation(item.placePrediction)
                              }
                            >
                              <div className="text-base font-medium leading-6">
                                {
                                  item?.placePrediction.structuredFormat
                                    .mainText.text
                                }
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-3 w-full">
                  <div className="w-full flex flex-col gap-4">
                    {mapView && mapFailed ? (
                      <p className="py-10 text-center text-sm text-[var(--status-error-default)]">
                        {t("map_unavailable") || "The map could not be loaded. Please try again later."}
                      </p>
                    ) : mapView && isLoaded ? (
                      <LocationPickerMap
                        provider={provider}
                        tiles={getTileConfig(setting.setting)}
                        dark={theme == "dark"}
                        zoom={11}
                        center={center}
                        height="400px"
                        onMapClick={handleMapClick}
                        onMarkerDragStart={onMarkerDragStart}
                        onMarkerDragEnd={handleDragEnd}
                      />
                    ) : null}
                  </div>

                  <div className="flex flex-col gap-1">
                    <p className="text-center text-base font-medium leading-6 text-[var(--foreground-secondary)]">
                      <b>{t("address")} : </b>
                      {addressLoading
                        ? "...."
                        : localLocation.formatted_address}
                    </p>
                  </div>
                  <button
                    onClick={() => handleConfirmLocation()}
                    className="w-full rounded-lg px-4 py-2 text-base font-medium leading-6 bg-[var(--button-primary-background-default)] text-[var(--button-primary-foreground-default)] transition-colors hover:bg-[var(--button-primary-background-hover)]"
                  >
                    {t("confirm")}
                  </button>
                  <button onClick={() => setMapView(false)} className="w-full rounded-lg px-4 py-2 text-base font-medium leading-6 text-[var(--button-link-foreground-default)] transition-colors hover:text-[var(--button-link-foreground-hover)]">
                    {t("go_back")}
                  </button>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
};

export default Location;
