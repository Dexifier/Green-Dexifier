import React, { InputHTMLAttributes } from "react";
import { IoSearchSharp } from "react-icons/io5";

const Search = ({
  ...props
}: InputHTMLAttributes<HTMLInputElement>) => {
  return (
    <div className="pe-[1rem] flex items-center gap-2 bg-black/40 rounded-2xl border border-white/10 transition duration-300 hover:border-white/20 focus-within:border-primary/60 focus-within:shadow-neon-sm">
      <input
        className="ps-[1rem] py-2.5 w-full bg-transparent text-white border-none outline-none placeholder:text-white/40"
        placeholder="Search"
        {...props}
      />
      <IoSearchSharp className="font-bold text-[1.5rem] text-primary" />
    </div>
  );
};

export default Search;
