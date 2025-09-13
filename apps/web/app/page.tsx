"use client"
import Image, { type ImageProps } from "next/image";
import { Button } from "@repo/ui/button";
import styles from "./page.module.css";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = Omit<ImageProps, "src"> & {
  srcLight: string;
  srcDark: string;
};

const ThemeImage = (props: Props) => {
  const { srcLight, srcDark, ...rest } = props;

  return (
    <>
      <Image {...rest} src={srcLight} className="imgLight" />
      <Image {...rest} src={srcDark} className="imgDark" />
    </>
  );
};

export default function Home() {
  const [roomId, setRoomId] = useState("");
  const router = useRouter()

  return (
    <div className={styles.page}>
      <input type="text" placeholder="RoomID" value={roomId} onChange={(e) => setRoomId(e.target.value)} />
      <button onClick={() => router.push(`/room/${roomId}`)}>Start</button>
    </div>
  );
}
