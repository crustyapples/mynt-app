import React, { useState } from "react";
import { storage,database } from "../firebaseConfig";
import { setDoc, doc } from "firebase/firestore";
import { ref, uploadBytes } from "firebase/storage";
import axios from "axios";

const JWT = process.env.NEXT_PUBLIC_PINATA_JWT;


const EventForm = () => {
  const [eventName, setEventName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [dateTime, setDateTime] = useState("");
  const [venue, setVenue] = useState("");
  const [capacity, setCapacity] = useState("");
  const [symbol, setSymbol] = useState("");
  const [image, setImage] = useState<File>();

  async function handleClick() {
    console.log(eventName, dateTime, venue, capacity, image);
    if (!eventName || !dateTime || !venue || !capacity || !symbol || !image) {
      alert('Please fill out all required fields.');
      return;
    }
    if (Number(price) < 0) {
      alert('Price cannot be negative.');
      return;
    }
    if (Number(capacity) <= 0) {
      alert('Capacity must be a positive number.');
      return;
    }
    const eventDate = new Date(dateTime);
    if (eventDate.getTime() <= Date.now()) {
      alert('Event date must be a future date.');
      return;
    }
    if (symbol.length > 18) {
      alert('Symbol must be 18 characters or less.');
      return;
    }    

    const ipfsHash = await pinataUpload(image);

    uploadData({
      title: eventName,
      description: description,
      price: Number(price),
      time: dateTime,
      venue: venue,
      capacity: capacity,
      symbol: symbol,
      imageCID: ipfsHash,
    }, image);
  }

  const pinataUpload = async (image: any) => {
    const formData: {
      append: (arg0: string, arg1: any) => void;
      _boundary: any;
    } = new FormData() as any;
    formData.append("file", image);

    const metadata = JSON.stringify({
      name: "File name",
    });
    formData.append("pinataMetadata", metadata);

    const options = JSON.stringify({
      cidVersion: 0,
    });
    formData.append("pinataOptions", options);

    try {
      const res = await axios.post(
        "https://api.pinata.cloud/pinning/pinFileToIPFS",
        formData,
        {
          maxBodyLength: Infinity,
          headers: {
            "Content-Type": `multipart/form-data; boundary=${formData._boundary}`,
            Authorization: `Bearer ${JWT}`,
          },
        }
      );
      console.log(res.data.IpfsHash);
      return res.data.IpfsHash;
    } catch (error) {
      console.log(error);
    }
  };

  const storageRef = ref(storage, eventName + dateTime);

  const uploadData = (data: { title: string; description: string; price: number; time: string; venue: string; capacity: string; symbol: string; imageCID: string;} | undefined, image: File) => {
    // const dbInstance = collection(database, '/MerchantCollection');
    if (data) {
      const dbInstance = doc(database, "/events", data.title + data.time);
      setDoc(dbInstance, data).then(() => {

        console.log("uploaded form data");
        // 'file' comes from the Blob or File API
        uploadBytes(storageRef, image!).then((snapshot) => {
          console.log("Uploaded file!");
          alert("Event created successfully!")
          // send to home
          window.location.href = "/";
        });
        
      });
      


    }

  };

  return (
    <form className="w-2/3 bg-gray-100 p-6 rounded-lg shadow-md">
      <div className="mb-4">
        <label
          className="block text-gray-700 font-medium mb-2"
          htmlFor="event-name"
        >
          Event Name
        </label>
        <input
          className="border border-gray-400 p-2 w-full rounded-md"
          id="event-name"
          type="text"
          placeholder="Enter the event name"
          value={eventName}
          onChange={(e) => setEventName(e.target.value)}
        />
      </div>
      <div className="mb-4">
        <label
          className="block text-gray-700 font-medium mb-2"
          htmlFor="event-name"
        >
          Description
        </label>
        <input
          className="border border-gray-400 p-2 w-full rounded-md"
          id="description"
          type="text"
          placeholder="Enter the event description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>
      <div className="mb-4">
        <label
          className="block text-gray-700 font-medium mb-2"
          htmlFor="event-name"
        >
          Price
        </label>
        <input
          className="border border-gray-400 p-2 w-full rounded-md"
          id="price"
          type="text"
          placeholder="Enter the registration price"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
        />
      </div>
      <div className="mb-4">
        <label
          className="block text-gray-700 font-medium mb-2"
          htmlFor="date-time"
        >
          Date/Time
        </label>
        <input
          className="border border-gray-400 p-2 w-full rounded-md"
          id="date-time"
          type="datetime-local"
          value={dateTime}
          onChange={(e) => {setDateTime(e.target.value)
          console.log(e.target.value)}}
        />
      </div>
      <div className="mb-4">
        <label className="block text-gray-700 font-medium mb-2" htmlFor="venue">
          Venue (Location)
        </label>
        <input
          className="border border-gray-400 p-2 w-full rounded-md"
          id="venue"
          type="text"
          placeholder="Enter the venue"
          value={venue}
          onChange={(e) => setVenue(e.target.value)}
        />
      </div>
      <div className="mb-4">
        <label
          className="block text-gray-700 font-medium mb-2"
          htmlFor="capacity"
        >
          Capacity
        </label>
        <input
          className="border border-gray-400 p-2 w-full rounded-md"
          id="capacity"
          type="number"
          placeholder="Enter the capacity"
          value={capacity}
          onChange={(e) => setCapacity(e.target.value)}
        />
      </div>
      <div className="mb-4">
        <label
          className="block text-gray-700 font-medium mb-2"
          htmlFor="nft-symbol"
        >
          NFT Symbol
        </label>
        <input
          className="border border-gray-400 p-2 w-full rounded-md"
          id="nft-symbol"
          type="text"
          placeholder="Enter the nft symbol"
          value={symbol}
          onChange={(e) => setSymbol(e.target.value)}
        />
      </div>
      <div className="mb-4">
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
      </div>
      <button
      type="button"
        className="w-full text-white bg-black hover:bg-gray-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center"
        onClick={handleClick}
      >
        Submit
      </button>
    </form>
  );
};

export default EventForm;


