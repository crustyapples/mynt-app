import React, { useState } from "react";
import { database } from "../firebaseConfig";
import { setDoc, doc } from "firebase/firestore";
import axios from "axios";
import ConfirmationModal from "./confirmationModal"
import { Box, Skeleton, Spinner, Center } from "@chakra-ui/react";

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
  eventType: string;
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
  eventType,
  imageCID,
}: EventFormProps) => {
  const [loading, setLoading] = useState(false);
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [showNotifyModal, setShowNotifyModal] = useState(false);

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

  const uploadData = async(
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
      await setDoc(dbInstance, data).then(() => {
        console.log("finished uploading event nft data");
      });
    }
    
  };

  function handleIssueClick() {
    setShowIssueModal(true);
  }

  function handleNotifyClick() {
    setShowNotifyModal(true);
  }

  async function handleIssueConfirm() {
    setShowIssueModal(false);
    console.log(eventName2, dateTime2, venue2, capacity2);
    setLoading(true);
    
    const result = await getSelectResult();
    if (result) {
      const winners = result.winners;
      const losers = result.losers;
      // once the winners and losers arrays are derived, issue the NFTs to them
      issueNfts(winners, losers);
    } else {
      // Handle the case when result is undefined
      console.error("Failed to get selection result");
    } 
  }

  async function handleNotifyConfirm() {
    setShowIssueModal(false);
    setLoading(true);
    notifyUsers();
  }

  async function getSelectResult() {
    const response = await axios.get(BASE + "/getEventRegistrations/"+ eventName2);
    const registrations = response.data;

    const successfulRegistrations = registrations.filter((registration: { status: any }) => registration.status == "SUCCESSFUL");
    const successfulUserIds = successfulRegistrations.map((registration: { userId: any }) => registration.userId);

    const winners = users.filter((user: any) => successfulUserIds.includes(user.id));
    const losers = users.filter((x: any) => !winners.includes(x));

    if (winners.length == 0) {
      alert('Please conduct the selection first!');
      setLoading(false);
      window.location.reload();
      return;
    } else{
      return {winners, losers};
    }
    
  }

  async function issueNfts(winners: any[], losers: any[]) {
    const response = await axios.get(BASE + "/getEventRegistrations/"+ eventName2);
    const registrations = response.data;
    const existingMintAccount = registrations.some((registration: { mint_account?: any }) => registration.mint_account);

    if (existingMintAccount) {
      alert('NFTs has already been minted before!');
      setLoading(false);
      window.location.reload();
      return
    }

    console.log("uploading metadata")
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
    
      
    await pinataMetadataUpload(metadata).then(async (res) => {
      await uploadData(
        {
          merchantKey: "GjjWyt7avbnhkcJzWJYboA33ULNqFUH5ZQk58Wcd2n2z",
          symbol: symbol,
          title: eventName2,
          uri: `https://ipfs.io/ipfs/${res}`,
        }
      );
    });
    console.log("Issuing NFTs to winners");
    const userIds = winners.map((user) => user.id);

    const data = {
      user_ids: userIds,
      event_title: eventName2,
      status: "SUCCESSFUL",
    };

    axios.post(BASE + "/mintNFT", data)
      .then((response) => {
        console.log(response.data);
        console.log("Updating Registrations with Mint Accounts");

        const mintPromises = [];
        const responseData = response.data;

        for (let i = 0; i < userIds.length; i++) {
          const userId = userIds[i];
          const mintAccount = responseData[i][userId];
          const updateData = {  
            user_id: userId,
            event_title: eventName2,
            status: "SUCCESSFUL",
            mint_account: mintAccount,
          };

          mintPromises.push(axios.post(BASE + "/updateRegistration", updateData));
        }

        return Promise.all(mintPromises);
      })
      .then((updateResponses) => {
        console.log(updateResponses);
      })
      .catch((error) => {
        console.error(error);
      })
      .finally(() => {
        setLoading(false);
        window.location.reload();
      });
  }

  async function notifyUsers() {
    const response = await axios.get(BASE + "/getEventRegistrations/"+ eventName2);
    const registrations = response.data;
    const missingMintAccount = registrations.some((registration: { mint_account: any; }) => !registration.mint_account);

    if (missingMintAccount) {
      alert('Please issue the NFTs before notifying users');
      setLoading(false);
      window.location.reload();
      return;
    }

    const result = await getSelectResult();
    
    if (result){
      const winners = result.winners;
      const losers = result.losers;

      for (let i = 0; i < winners.length; i++) {
        console.log("updating winners")
        const message = `Congratulations! You have won a ticket to ${eventName2}! To view your registration status, use /start to access the menu. There will be a button to redeem your ticket under the "Events" tab. See you at ${eventName2}!`;
          const telegramPush = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage?chat_id=${(winners[i] as any).chat_id}&text=${message}`;
          fetch(telegramPush).then((res) => {
            console.log(res);
          })
      }

      for (let i = 0; i < losers.length; i++) {
        console.log("updating losers")
        const message = `Unfortunately, due to the over subscription for ${eventName2}, your registration was not successful. Your funds have been refunded and we hope to see you at the next event!`;
        const telegramPush = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage?chat_id=${(losers[i] as any).chat_id}&text=${message}`;
        fetch(telegramPush).then((res) => {
          console.log(res);
        })
      }
      setLoading(false);
      window.location.reload();
    }else{
      console.error("Failed to get selection result");
    }
    
  }

  return (
    <>
      {loading ? (
        <Box margin={0} padding="4" boxShadow="lg" bg="#f3f4f6">
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
          <button
            type="button"
            className="w-full text-white bg-black hover:bg-gray-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center mt-4"
            onClick={handleIssueClick}
          >
            Issue Tickets
          </button>
          <button
            type="button"
            className="w-full text-white bg-black hover:bg-gray-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center mt-4"
            onClick={handleNotifyClick}
          >
            Notify Users
          </button>
          <ConfirmationModal
            show={showIssueModal}
            title="Issue Confirmation"
            message="This will issue the tickets on the blockchain. Are you sure you want to continue?"
            onConfirm={handleIssueConfirm}
            onCancel={() => setShowIssueModal(false)}
          />
          <ConfirmationModal
            show={showNotifyModal}
            title="Notify Confirmation"
            message="This will notify users of their registration status on telegram. Are you sure you want to continue?"
            onConfirm={handleNotifyConfirm}
            onCancel={() => setShowNotifyModal(false)}
          />
        </form>
      )}
    </>
  );
};

export default SelectForm;
