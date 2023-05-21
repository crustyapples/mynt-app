import React, { useState } from "react";
import { database, storage } from "../firebaseConfig";
import { setDoc, doc } from "firebase/firestore";
import { ref, uploadBytes } from "firebase/storage";
import axios from "axios";
import ConfirmationModal from "./confirmationModal"
import { Box, Skeleton, SkeletonText, Spinner, Center } from "@chakra-ui/react";

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

const RaffleForm = ({
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
  const [loading, setLoading] = useState(false);
  const [showRaffleModal, setShowRaffleModal] = useState(false);
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [winners, setWinners] = useState<any[]>([]);
  const [losers, setLosers] = useState<any[]>([]);

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

  async function raffleSelect(users: any, amount: number) {
    const winners: any[] = [];
    const tempArr = [...users];
    for (let i = 0; i < amount; i++) {
      if (tempArr.length === 0) {
        break;
      }
      const randomIndex = Math.floor(Math.random() * tempArr.length);
      winners.push(tempArr[randomIndex]);
      tempArr.splice(randomIndex, 1);
    }
    const losers = users.filter((x: any) => !winners.includes(x));
    
    return {winners, losers};
  }

  async function notifyUsers(winners: string[], losers: string[]) {
    for (let i = 0; i < winners.length; i++) {
      console.log("updating winners")
      const message = `Congratulations! You have won a ticket to ${eventName2}! To view your registration status, use /start to access the menu. There will be a button to redeem your ticket under the "Events" tab. See you at ${eventName2}!`;
        const telegramPush = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage?chat_id=${winners[i].chat_id}&text=${message}`;
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
  }

  function handleRaffleClick() {
    setShowRaffleModal(true);
  }

  function handleIssueClick() {
    setShowIssueModal(true);
  }

  async function handleRaffleConfirm() {
    setShowRaffleModal(false);
    setLoading(true);
    
    console.log("conducting raffle")
    try{
      //set check to see if raffle has been conducted before
      const response = await axios.get(BASE + "/getEventRegistrations/"+ eventName2);
      const registrations = response.data;
      console.log(registrations)
      // Check if any registration has a status other than PENDING
      const nonPendingRegistrations = registrations.filter((registration: { status: string }) => registration.status !== "PENDING");
      
      if (nonPendingRegistrations.length > 0) {
        // Exit the function if any registration is not pending
        alert('Raffle has already been conducted!');
        setLoading(false);
        window.location.reload();
        return;
      }
      const amount = parseInt(capacity2);
      const result = await raffleSelect(users, amount);
      const winners = result.winners
      const losers = result.losers

      console.log("winners", winners);
      console.log("losers", losers);

      if (winners.length == 0) {
        alert('Error when selecting winners');
        setLoading(false);
        window.location.reload();
        return;
      }

      for (let i = 0; i < losers.length; i++) {
        const data = {
          user_id: (losers[i] as any).id,
          event_title: eventName2,
          status: "UNSUCCESSFUL",
        };
        
        axios
        .post(BASE + "/updateRegistration", data)
        .then((response: { data: any }) => {
          console.log(response.data);
        })
        .catch((error: any) => {
          console.log(error);
        });
        
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
        const registrationData = {
          user_id: winners[i].id,
          event_title: eventName2,
          status: "SUCCESSFUL",
        };
        axios.post(BASE + "/updateRegistration", registrationData).then((response: { data: any }) => {
          console.log(response.data);
          counter += 1;
        }).then(() => {
          if (counter === winners.length) {
            console.log("raffle conducted")
            setLoading(false);
            
            window.location.reload();
            
          }
        }) 
      }
    } catch (error: any) {
      console.log("Error when issuing tickets: "+ error);
    }


  }
  // this is the function that should handle the minting and notification
  function handleIssueConfirm() {
    setShowIssueModal(false);
    console.log(eventName2, dateTime2, venue2, capacity2);
    setLoading(true);
    
    // there should be a method that reconstructs the winners and losers array and set as a state
    const result = getRaffleResult()
    // there should also be a check to see if its possible, if there are no winners, it should prompt the user
    // to conduct the raffle first
    issueNfts()    
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
      });
    }
    
  };
  async function issueNfts() {
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
    
      
    await pinataMetadataUpload(metadata).then((res) => {
      uploadData(
        {
          // merchantKey: address[0],
          merchantKey: "GjjWyt7avbnhkcJzWJYboA33ULNqFUH5ZQk58Wcd2n2z",
          symbol: symbol,
          title: eventName2,
          uri: `https://ipfs.io/ipfs/${res}`,
        }
      );
      
    });

    console.log("Issuing NFTs to winners")
    for (let i = 0; i < winners.length; i++) {
      const data = {
        user_id: winners[i].id,
        event_title: eventName2,
        status: "SUCCESSFUL",
      };

      axios.post(BASE + "/mintNFT", data).then((response: { data: any }) => {
        console.log(response.data.mintAccount);
        const ticketLink = `https://solana.fm/address/${response.data.mintAccount}/metadata?cluster=devnet-qn1`;
      })
    }
  }

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
          
          <button
            type="button"
            className="w-full text-white bg-black hover:bg-gray-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center mt-4"
            onClick={handleRaffleClick}
          >
            Conduct Raffle
          </button>
          <button
            type="button"
            className="w-full text-white bg-black hover:bg-gray-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center mt-4"
            onClick={handleIssueClick}
          >
            Issue Tickets and Notify users
          </button>
          <ConfirmationModal
        show={showRaffleModal}
        title="Raffle Confirmation"
        message="This will use a raffle system to determine which user will win the tickets. Are you sure you want to continue?"
        onConfirm={handleRaffleConfirm}
        onCancel={() => setShowRaffleModal(false)}
      />
      <ConfirmationModal
        show={showIssueModal}
        title="Issue Confirmation"
        message="This will issue the tickets on the blockchain and notify users on telegram. Are you sure you want to continue?"
        onConfirm={handleIssueConfirm}
        onCancel={() => setShowIssueModal(false)}
      />
        </form>
      )}
    </>
  );
};

export default RaffleForm;
