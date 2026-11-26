vote1 = 0
vote2 = 0
vote3 = 0

voter_ids = set()

ADMIN_PASSWORD = "999"

while True:

    print("WELCOME TO VOTIFY\nEvery Voice Matters, Every Vote Counts.")
    print("1. Vote")
    print("2. Show Results")
    print("3. Show Winner")
    print("4. Exit")

    choice = input("KINDLY CHOOSE FROM THE ACTIONS BELOW: ")

    if choice == "1":
        voter_id = input("Please Enter Your Voter ID: ").strip()

        if voter_id in voter_ids:
            print("YOU HAVE ALREADY VOTED. ONE VOTE PER PERSON.")
        elif voter_id == "":
            print("Voter ID cannot be empty.")
        else:
            print("The Candidates Available Are:")
            print("1. JOHN ALI")
            print("2. ASAAH YINEBISA")
            print("3. JOE-EDDIE")

            candidate_chosen = input("Please Select the number of the candidate you wish to vote for: ")

            if candidate_chosen == "1":
                vote1 += 1
                voter_ids.add(voter_id)
                print("VOTED SUCCESSFULLY")
            elif candidate_chosen == "2":
                vote2 += 1
                voter_ids.add(voter_id)
                print("VOTED SUCCESSFULLY")
            elif candidate_chosen == "3":
                vote3 += 1
                voter_ids.add(voter_id)
                print("VOTED SUCCESSFULLY")
            else:
                print("Invalid Command")

    elif choice == "2":
        print("To View Results, You Must Be An Admin")

        admin_password = input("Admin Password: ")
        if admin_password == ADMIN_PASSWORD:
            print("ACCESS GRANTED")
            print("1. JOHN ALI - total votes =", vote1)
            print("2. ASSAH YINEBISA - total votes =", vote2)
            print("3. JOE-EDDIE - total votes =", vote3)
        else:
            print("ACCESS DENIED")

    elif choice == "3":
        print("The Winner Of This Election is:")
        winner = max(vote1, vote2, vote3)

        # Handle ties explicitly
        winners = []
        if vote1 == winner:
            winners.append("JOHN ALI")
        if vote2 == winner:
            winners.append("ASAAH YINEBISA")
        if vote3 == winner:
            winners.append("JOE-EDDIE")

        if winner == 0:
            print("No votes have been cast yet.")
        elif len(winners) > 1:
            print("IT'S A TIE between:", ", ".join(winners), "with", winner, "votes each")
        else:
            print(f"THE WINNER OF THIS ELECTION IS 🔥🔥🔥{winners[0]}🔥🔥🔥 with: {winner} votes")

    elif choice == "4":
        print("GOODBYE AND THANK YOU FOR YOUR TIME")
        break

    else:
        print("INVALID CHOICE")
