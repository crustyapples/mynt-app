import { useState } from "react";
import Form from "./form";
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  useDisclosure,
} from "@chakra-ui/react";

import EditForm from "./editForm";
import { database } from "@/firebaseConfig";
import { deleteDoc, doc } from "firebase/firestore";
import Link from "next/link";

interface CardProps {
  title: string;
  description: string;
  price: number;
  time: string;
  venue: string;
  capacity: string;
}

export default function Card({
  title,
  description,
  price,
  time,
  venue,
  capacity,
}: CardProps) {
  const { isOpen: isOpenEditModal, onOpen: onOpenEditModal, onClose: onCloseEditModal } = useDisclosure();
  const [deleted, setDeleted] = useState(false);

  function dateFormat(dateString: string | number | Date) {
    let date = new Date(dateString);
    return date.toLocaleString();
  }

  async function handleDelete() {
    await deleteDoc(doc(database, "events", title + time));
    setDeleted(true);
  }

  function handleClick() {
    console.log("Clicked!");
  }

  const imageSrc = `https://firebasestorage.googleapis.com/v0/b/treehoppers-mynt.appspot.com/o/${
    title + time
  }?alt=media&token=07ddd564-df85-49a5-836a-c63f0a4045d6`;

  return (
    <>
      <div
        className={
          deleted
            ? "invisible absolute"
            : "" +
              "w-80 bg-gray-100 rounded-lg shadow-md justify-center border border-white hover:shadow-xl hover:border-black hover:-translate-y-1 transition ease-in-out"
        }
      >
        <Link
                href="/post/[id]"
                as={`/post/${title + time}`}
              >
          <img
            className="rounded-t-lg h-48 w-full object-cover object-center"
            // src="https://source.unsplash.com/random"
            src={imageSrc}
            alt="event image"
          />
          <div className="p-2 flex flex-col justify-center">
            <h2 className="text-2xl font-bold text-left">{title}</h2>
            <a className="font-light text-gray-600 tracking-tight">
              {dateFormat(time)}
            </a>

            <h5 className="my-2 tracking-tight text-gray-900">{description}</h5>
            <div className="flex flex-wrap justify-left">
              <a className="flex flex-wrap items-center text-sm my-1 mr-1 p-2 tracking-tight bg-slate-300 rounded-lg text-gray-900">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="w-6 h-6"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
                  />
                </svg>

                {capacity}
              </a>
              <a className="flex flex-wrap items-center text-sm my-1 p-2 tracking-tight bg-slate-300 rounded-lg text-gray-900">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="w-6 h-6"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z"
                  />
                </svg>
                {venue}
              </a>
            </div>
          </div>

          <div className="px-2 pb-5">
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold text-gray-900">${price}</span>
            </div>
          </div>

          <div className="w-full flex flex-col justify-center">
            <Modal isOpen={isOpenEditModal} onClose={onCloseEditModal}>
              <ModalOverlay />
              <ModalContent>
                <ModalHeader>Edit Event</ModalHeader>
                <ModalCloseButton />
                <ModalBody>
                  <EditForm
                    eventName2={title}
                    description2={description}
                    price2={price}
                    dateTime2={time}
                    venue2={venue}
                    capacity2={capacity}
                  />
                </ModalBody>

                <ModalFooter>
                  <button
                    className="w-full my-2 mx-auto text-white bg-red-500 hover:bg-gray-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center"
                    onClick={onCloseEditModal}
                  >
                    Close
                  </button>
                </ModalFooter>
              </ModalContent>
            </Modal>
          </div>
        </Link>
      </div>
    </>
  );
}
