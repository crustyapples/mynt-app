import React, { useState } from "react";
import { database, storage } from "../firebaseConfig";
import { setDoc, doc } from "firebase/firestore";
import { ref, uploadBytes } from "firebase/storage";
import axios from "axios";
import { Box, Skeleton, SkeletonText, Spinner, Center } from "@chakra-ui/react";
import ConfirmationModal from "./confirmationModal"

const JWT = process.env.NEXT_PUBLIC_PINATA_JWT;
const TELEGRAM_TOKEN = process.env.NEXT_PUBLIC_TELEGRAM_BOT;
const BASE = process.env.NEXT_PUBLIC_API_BASE_URL;

interface EventFormProps {
  eventName2: string;
  description2: string;
  price2: number;
  dateTime2: string;
  venue2: string;
  capacity2: string;
  users: string[];
  address: string[];
  symbol: string;
  imageCID: string;
}

const SelectForm = ({
  eventName2,
  description2,
  price2,
  dateTime2,
  venue2,
  capacity2,
  users,
  address,
  symbol,
  imageCID,
}: EventFormProps) => {
  // const [image, setImage] = useState<File>();
  const [loading, setLoading] = useState(false);

  function dateFormat(dateString: string | number | Date) {
    let date = new Date(dateString);
    return date.toLocaleString();
  }

  const pinataMetadataUpload = async (data: any) => {
    const res = await fetch(BASE + "/uploadMetadata", {
      method: "POST",
      headers: {
        Accept: "application/json, text/plain, */*",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    const result = await res.text();
    return result;
  };

  function firstComeSelect(users: any, amount: number) {
    return users
    .sort((a: { registration_time: string; }, b: { registration_time: string; }) => a.registration_time.localeCompare(b.registration_time))
    .slice(0, amount);
  }

  async function conductSelect() {
    console.log("conducting slection based on first-come first-serve")
    const amount = parseInt(capacity2);
    const winners = firstComeSelect(users, amount);
    const losers = users.filter((x) => !winners.includes(x));

    console.log("winners", winners);
    console.log("losers", losers);

    for (let i = 0; i < losers.length; i++) {
      const data = {
        user_id: (losers[i] as any).id,
        event_title: eventName2,
        status: "UNSUCCESSFUL",
      };
      console.log("updating losers")
      const message = `Unfortunately, due to the over subscription for ${eventName2}, your registration was not successful. Your funds have been refunded and we hope to see you at the next event!`;
      const telegramPush = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage?chat_id=${losers[i].chat_id}&text=${message}`;
      fetch(telegramPush).then((res) => {
        console.log(res);
      }).then(() => {
        axios
        .post(BASE + "/updateRegistration", data)
        .then((response: { data: any }) => {
          console.log(response.data);
        })
        .catch((error: any) => {
          console.log(error);
        });
      })
      

      const timestamp = new Date().toLocaleString("en-US", { timeZone: "UTC" });

      const transaction = {
        user_id: (losers[i] as any).id,
        amount: price2,
        transaction_type: "REFUND",
        timestamp: timestamp,
        event_title: eventName2,
      };

      axios
        .post(BASE + "/raffleRefund", transaction)
        .then((response: { data: any }) => {
          console.log(response.data);
        })
        .catch((error: any) => {
          console.log(error);
        });
    }

    let counter = 0;

    for (let i = 0; i < winners.length; i++) {
      const data = {
        user_id: winners[i].id,
        event_title: eventName2,
        status: "SUCCESSFUL",
      };

      console.log("updating winners")

      axios.post(BASE + "/mintNFT", data).then((response: { data: any }) => {
        console.log(response.data.mintAccount);
        const ticketLink = `https://solana.fm/address/${response.data.mintAccount}/metadata?cluster=devnet-qn1`;
        const message = `Congratulations! You have won a ticket to ${eventName2}! To view your registration status, use /start to access the menu. There will be a button to redeem your ticket under the "Events" tab. See you at ${eventName2}!`;
        const telegramPush = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage?chat_id=${winners[i].chat_id}&text=${message}`;
        fetch(telegramPush).then((res) => {
          console.log(res);
        }).then(() => {
          const registrationData = {
            user_id: winners[i].id,
            event_title: eventName2,
            status: "SUCCESSFUL",
            mint_account: response.data.mintAccount,
          };
          axios.post(BASE + "/updateRegistration", registrationData).then((response: { data: any }) => {
            console.log(response.data);
            counter += 1;
          }).then(() => {
            if (counter === winners.length) {
              console.log("selection conducted")
              setLoading(false);
              
              window.location.reload();
              
            }
          })
        })
      })
    }


    
    
  }
  
  const [showModal, setShowModal] = useState(false);

  function handleClick() {
    setShowModal(true);
  }


  function handleCancel() {
    setShowModal(false);
  }

  function handleConfirm() {
    setShowModal(false);

    console.log(eventName2, dateTime2, venue2, capacity2);
    // Upload image to /uploadFile endpoint using Pinata
    setLoading(true);
    const metadata = {
      title: eventName2,
      symbol: symbol,
      description: description2,
      image: `https://ipfs.io/ipfs/${imageCID}`,
      attributes: [
        { trait_type: "Date/Time", value: dateFormat(dateTime2) },
        { trait_type: "Ticket Price", value: price2 },
        { trait_type: "Venue", value: venue2 },
      ],
      properties: {
        files: [
          {
            uri: `https://ipfs.io/ipfs/${imageCID}`,
            type: "image/png",
          },
        ],
        category: null,
      },
    };
    console.log("This is the metadata: "+metadata);
    
      
    pinataMetadataUpload(metadata).then((res) => {
      uploadData(
        {
          merchantKey: address[0],
          symbol: symbol,
          title: eventName2,
          uri: `https://ipfs.io/ipfs/${res}`,
        }
      );
      
    });
  }

  const uploadData = (
    data:
      | {
          merchantKey: string;
          symbol: string;
          title: string;
          uri: string;
        }
  ) => {
    console.log("uploading event nft data")
    if (data) {
      const title = data.title + "-nft";
      const dbInstance = doc(database, "/nfts", title + dateTime2);
      setDoc(dbInstance, data).then(() => {
        console.log("finished uploading event nft data");
        conductSelect()
      });
    }
    
  };

  return (
    <>
      {loading ? (
        <Box margin={0} padding="4" boxShadow="lg" bg="#f3f4f6">
          <Skeleton margin={2} height={12} />
          <Skeleton margin={2} height={12} />
          <Skeleton margin={2} height={12} />
          <Center>
            <Spinner />
          </Center>
        </Box>
      ) : (
        <form className="bg-gray-100 p-4 rounded-lg shadow-md">
          <div className="my-4">
            <h1 className="text-2xl font-bold text-center">{eventName2}</h1>
          </div>
          {/* <div className="mb-4">
            <label
              className="block text-gray-700 font-medium mb-2"
              htmlFor="image"
            >
              Image
            </label>
            <input
              className="border border-gray-400 p-2 w-full rounded-md"
              id="image"
              type="file"
              onChange={(e) => setImage(e.target.files?.[0])}
            />
          </div> */}
          <button
            type="button"
            className="w-full text-white bg-black hover:bg-gray-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center"
            onClick={handleClick}
          >
            Conduct Selection
          </button>
          <ConfirmationModal
          show={showModal}
          title="Confirmation"
          message="This will use first-come, first-serve method to determine which user will win the tickets. Are you sure you want to continue?"
          onConfirm={handleConfirm}
          onCancel={handleCancel}
        />
        </form>
      )}
    </>
  );
};

export default SelectForm;
