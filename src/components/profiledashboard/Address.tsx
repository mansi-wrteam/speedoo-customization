import React, { use, useEffect, useState } from "react";
import { t } from "@/utils/translation";
import { CiCirclePlus } from "react-icons/ci";
import AddressCard from "../cards/AddressCard";
import dynamic from 'next/dynamic';
const NewAddressModal = dynamic(() => import('../newaddressmodal/NewAddressModal'), {
  ssr: false,
});
import * as api from "@/api/apiRoutes";
import { useSelector, useDispatch } from "react-redux";
import { setAllAddresses } from "@/redux/slices/addressSlice";
import CardSkeleton from "../skeleton/CardSkeleton";
import { GoPlusCircle } from "react-icons/go";
import type { AppDispatch } from "@/redux/hooks";
import type { RootState } from "@/types/state";

const Address = () => {
  const dispatch = useDispatch<AppDispatch>();

  const addresses = useSelector((state: RootState) => state.Addresses);
  const [showAddAddres, setShowAddAddres] = useState(false);
  const [isAddressSelected, setIsAddressSelected] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchAddress();
  }, []);

  // const addressPerPage = 10;

  const fetchAddress = async () => {
    setLoading(true);
    try {
      const response = await api.getAddress();
      if (response.status == 1) {
        dispatch(setAllAddresses({ data: response.data }));
      } else {
        dispatch(setAllAddresses({ data: [] }));
      }
      setLoading(false);
    } catch (error) {
      setLoading(false);
      console.log("Error", error);
    }
  };

  const handleshowAddres = () => {
    setIsAddressSelected(false);
    setShowAddAddres(true);
  };

  return (
    <div className="w-full overflow-hidden rounded-2xl outline outline-1 -outline-offset-1 outline-[var(--border-subtle)]">
      <div className="flex justify-between items-center gap-3 p-4 bg-[var(--surface-subtle)] border-b border-[var(--border-subtle)]">
        <h2 className="flex-1 text-xl font-medium leading-7 text-[var(--foreground-primary)]">
          {t("manage_address")}
        </h2>
        {addresses?.allAddresses?.length > 0 && (
          <button
            className="flex items-center gap-1 rounded-lg px-4 py-2 text-base font-medium leading-6 bg-[var(--button-primary-background-default)] text-[var(--button-primary-foreground-default)] transition-colors hover:bg-[var(--button-primary-background-hover)]"
            onClick={handleshowAddres}
          >
            <CiCirclePlus size={16} />
            {t("add_new_address")}
          </button>
        )}
      </div>
      <div className="">
        {loading ? (
          Array?.from({ length: 6 })?.map((_, index) => {
            return <CardSkeleton key={index} height={200} padding="2px" />;
          })
        ) : addresses?.allAddresses?.length > 0 ? (
          addresses?.allAddresses &&
          addresses?.allAddresses?.map((address) => {
            return (
              <div key={address?.id}>
                <AddressCard
                  address={address}
                  setShowAddAddres={setShowAddAddres}
                  setIsAddressSelected={setIsAddressSelected}
                  fetchAddress={fetchAddress}
                  fromAddress={true}
                />
              </div>
            );
          })
        ) : (
          <div
            className=" flex justify-center  my-2 cursor-pointer"
            onClick={() => setShowAddAddres(true)}
          >
            <div className="flex w-[200px] items-center justify-center gap-2 rounded-lg border-2 border-dashed border-[var(--border-default)] p-3 text-xl font-bold text-[var(--foreground-primary)]">
              <GoPlusCircle /> {t("add_address")}
            </div>
          </div>
        )}

      </div>
      {showAddAddres && (<NewAddressModal
        showAddAddres={showAddAddres}
        setShowAddAddres={setShowAddAddres}
        isAddressSelected={isAddressSelected}
        fetchAddress={fetchAddress}
      />)}
    </div>
  );
};

export default Address;
