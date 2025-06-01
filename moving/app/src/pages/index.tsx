import { useState, useEffect } from 'react'
import Head from 'next/head'
import Clock from '../components/Clock'

export default function Home() {
    return (
        <>
            <Head>
                <title>Moving Clock</title>
                <meta name="description" content="A simple running clock that never stops" />
                <meta name="viewport" content="width=device-width, initial-scale=1" />
                <link rel="icon" href="/favicon.ico" />
            </Head>
            <main className="main">
                <div className="container">
                    <h1 className="title">Moving Clock</h1>
                    <Clock />
                </div>
            </main>
        </>
    )
} 