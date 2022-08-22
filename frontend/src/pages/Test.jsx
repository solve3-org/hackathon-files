import React, { useState } from 'react';
import { useEffect } from 'react';
import solve3 from '../module/Solve3Modal';

const Test = () => {

  useEffect(() => {
    const init = async () => {
      await solve3.init({})
      solve3.open()
    }
    init();
  })

 
  return (
    <>
    </>
  );
}

export default Test;